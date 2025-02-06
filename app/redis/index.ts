import { createClient, RedisClientType } from 'redis';
import config from "../../config";
import logger from "../logger";
import { EventEmitter } from "events";

class RedisClient extends EventEmitter {
  public client: RedisClientType;
  public subscriber: RedisClientType;
  private channelCallbacks: Record<string, (message: string, channel: string) => void>;
  private _ready = false;
  private _readyCallbacks: ((err?: Error) => void)[];
  private _readyError: Error | null;

  constructor(host: string, port: string | number, password: string, db: string) {
    super();

    this.channelCallbacks = {};
    this._readyCallbacks = [];
    this._readyError = null;

    this.client = createClient({
      url: `redis://:${password}@${host}:${port}/${db}`,
      connectTimeout: 5000,  // 设置连接超时（5秒）
    });

    this.client.on('connect', () => {
      logger.info(`Redis connected: ${host}:${port}/${db}`, {
        isReady: this.client.isReady,
        isOpen: this.client.isOpen,
      });
      this.ready(true);
    });

    this.client.on('error', (err) => {
      logger.error(`Redis error: ${host}:${port}/${db}`, {
        isReady: this.client.isReady,
        isOpen: this.client.isOpen,
        error: err,
      });
    });

    this.client.on('reconnecting', () => {
      logger.warn(`Redis reconnecting: ${host}:${port}/${db}`, {
        isReady: this.client.isReady,
        isOpen: this.client.isOpen,
        subscribedChannels: Object.keys(this.channelCallbacks),
      });
      this._reSubscribeChannels(); // 重新订阅所有频道
    });
    this.client.on('end', () => {
      logger.warn('Redis connection closed');
    });

    this._init();
  }

  private _init() {
    this.client.connect();
  }

  ready(flag:boolean,): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if(flag){
        this._ready = flag
      }
      if (this._ready) {
        resolve();
      } else if (this._readyError) {
        reject(this._readyError);
      } else {
        this._readyCallbacks.push((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
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

  async subscribe(channel: string, callback: (message: string, channel: string) => void) {
    if (!this.channelCallbacks[channel]) {
      if (!this.subscriber?.isOpen) {
        const subscriber = this.client.duplicate();
        this.subscriber = subscriber;

        subscriber.on('error', (err) => {
          logger.error(`Redis subscriber error:`, err);
        });

        subscriber.on('connect', () => {
          logger.info(`Redis subscriber connected`);
        });

        subscriber.on('reconnecting', () => {
          logger.warn(`Redis subscriber reconnecting`);
          this._reSubscribeChannels(); // 重新订阅所有频道
        });

        subscriber.on('ready', () => {
          logger.info(`Redis subscriber ready`);
        });

        subscriber.on('close', () => {
          logger.warn(`Redis subscriber closed`);
        });

        await subscriber.connect();
      }

      this.subscriber.subscribe(channel, (message, channel) => {
        callback(message, channel);
      });
    }

    this.channelCallbacks[channel] = callback;
    logger.info(`Redis subscriber channels:`, Object.keys(this.channelCallbacks));
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
      logger.error(`Redis lock error:`, err);
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
      logger.error(`Redis unlock error:`, err);
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
      logger.error(`Redis counter error:`, err);
      throw err;
    }
  }
}

export default {
  master: new RedisClient(
    config.redis.master.host,
    config.redis.master.port,
    config.redis.master.password,
    config.redis.master.db
  ),
};
