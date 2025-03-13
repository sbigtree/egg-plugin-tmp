import {createClient, RedisClientType} from 'redis';
import config from "../../config";
import logger, {Log} from "../logger";
import {EventEmitter} from "events";
import Base from "sdk-base";


type GetConfig = () => { password: string, host: string, port: string, db: string }

class RedisClient extends Base {
  public client: RedisClientType;
  public subscriber: RedisClientType;
  private channelCallbacks: Record<string, (message: string, channel: string) => void>;
  private _ready = false;
  private _didInit = false; // 是否调用了init方法
  private _readyCallbacks: ((err?: Error) => void)[];
  private _readyError: Error | null;
  private _getConfig: GetConfig;

  constructor(getConfig: GetConfig) {
    super();

    this.channelCallbacks = {};
    this._readyCallbacks = [];
    this._readyError = null;
    this._getConfig = getConfig;

  }

  private _init() {
    if (this._didInit) return
    this._didInit = true
    const conf = this._getConfig()
    const url = `redis://:${conf.password}@${conf.host}:${conf.port}/${conf.db}`
    this.client = createClient({
      url: url,
    });

    this.client.on('connect', () => {
      Log.redis.info(process.pid, url, {
        isReady: this.client.isReady,
        isOpen: this.client.isOpen,
      });
      this.ready(true);
    });

    this.client.on('error', (err) => {
      Log.redis.error(process.pid, `Redis error: ${url}`, {
        isReady: this.client.isReady,
        isOpen: this.client.isOpen,
        error: err,
      });
    });

    this.client.on('reconnecting', () => {
      Log.redis.warn(process.pid, `Redis reconnecting: ${url}`, {
        isReady: this.client.isReady,
        isOpen: this.client.isOpen,
        subscribedChannels: Object.keys(this.channelCallbacks),
      });
      this.ready(true);
      this._initSubscribe(); // 重新订阅所有频道
    });
    this.client.on('end', () => {
      Log.redis.warn(process.pid, 'Redis connection closed');
    });
    this.client.connect();
  }

  ready(flag?: any) {
    if (arguments.length === 0) {
      return new Promise<void>((resolve, reject) => {
        if (this._ready) {
          return resolve();
        } else if (this._readyError) {
          return reject(this._readyError);
        }
        this._readyCallbacks.push(err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
        this._init()
      });
    } else if (typeof flag === 'function') {
      this._readyCallbacks.push(flag);
    } else if (flag instanceof Error) {
      this._ready = false;
      this._readyError = flag;
      if (!this._readyCallbacks.length) {
        this.emit('error', flag);
      }
    } else {
      this._ready = flag;
    }

    if (this._ready || this._readyError) {
      this._readyCallbacks.splice(0, this._readyCallbacks.length).forEach(callback => {
        process.nextTick(() => {
          callback(this._readyError);
        });
      });
    }


  }

  private _reSubscribeChannels() {
    if (this.subscriber?.isOpen) {
      Object.keys(this.channelCallbacks).forEach((channel) => {
        const callback = this.channelCallbacks[channel];
        this.subscriber.subscribe(channel, (message, channel) => {
          callback(message, channel);
        });
      });
    }
  }

  async _initSubscribe() {
    this.subscriber?.disconnect().catch(() => null)
    // const subscriber = this.client.duplicate();
    this.subscriber = null

    // subscriber.on('error', err => {
    //   logger.info(`_initSubscribe redis error `, err, subscriber.isOpen)
    // })
    // await subscriber.connect()
    // logger.warn(`redis subscriber init connected `, subscriber.isReady, subscriber.isOpen, Object.keys(this.channelCallbacks))

    Object.keys(this.channelCallbacks).map(async (channel) => {
      const callback = this.channelCallbacks[channel]
      logger.warn(process.pid, `redis re subscriber`, channel)
      this.subscriber?.subscribe(channel, callback)
    })
  }

  async subscribe(channel: string, callback: (message: string, channel: string) => void) {
    if (!this.channelCallbacks[channel]) {
      if (!this.subscriber?.isOpen) {
        const subscriber = this.client.duplicate();
        this.subscriber = subscriber;

        subscriber.on('error', (err) => {
          Log.redis.error(process.pid, `Redis subscriber error:`, err);
        });

        subscriber.on('connect', () => {
          Log.redis.info(process.pid, `Redis subscriber connected`);
        });

        subscriber.on('reconnecting', () => {
          Log.redis.warn(process.pid, `Redis subscriber reconnecting`);
          this._reSubscribeChannels(); // 重新订阅所有频道
        });

        subscriber.on('ready', () => {
          Log.redis.info(process.pid, `Redis subscriber ready`);
        });

        subscriber.on('close', () => {
          Log.redis.warn(process.pid, `Redis subscriber closed`);
        });

        await subscriber.connect();
      }

      this.subscriber.subscribe(channel, (message, channel) => {
        callback(message, channel);
      });
    }

    this.channelCallbacks[channel] = callback;
    Log.redis.info(process.pid, `Redis subscriber channels:`, Object.keys(this.channelCallbacks));
  }

  /**
   *
   * @param key
   * @param value
   * @param ex 秒
   */
  async lock(key: string, value: string, ex: number): Promise<number> {
    try {
      const lockScript = `
        if redis.call("setnx", KEYS[1], ARGV[1]) == 1 then
          redis.call("expire", KEYS[1], ARGV[2])
          return 1
        else
          return 0
        end
      `;

      const res = await this.client.eval(lockScript, {
        arguments: [value.toString(), ex.toString()],
        keys: [key],
      });

      return res as number;
    } catch (err) {
      Log.redis.error(process.pid, `Redis lock error:`, err);
      throw err;
    }
  }

  async unlock(key: string, value: string = '1'): Promise<number> {
    try {
      const unlockScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const res = await this.client.eval(unlockScript, {
        arguments: [value],
        keys: [key],
      });

      return res as number;
    } catch (err) {
      Log.redis.error(process.pid, `Redis unlock error:`, err);
      throw err;
    }
  }

  async counter(key: string, name: string, step: number = 1): Promise<number> {
    try {
      let script = `
      local step=tonumber(ARGV[2])
      local ex=tonumber(ARGV[3])
      if redis.call("exists",KEYS[1]) == 0 then
          redis.call("hset",KEYS[1],ARGV[1],step)
          if ex >0 then
            redis.call("expire",KEYS[1],ex)
          end  
            
          return ARGV[2]
      else
         return redis.call("hincrby",KEYS[1],ARGV[1],step)
      end 
    `

      const res = await this.client.eval(script, {
        arguments: [name, step.toString()],
        keys: [key],
      });

      return res as number;
    } catch (err) {
      Log.redis.error(process.pid, `Redis counter error:`, err);
      throw err;
    }
  }
}

export default {
  master: new RedisClient(() => {
    return {
      host: config.redis.master.host,
      port: config.redis.master.port,
      password: config.redis.master.password,
      db: config.redis.master.db
    }
  }),
};
