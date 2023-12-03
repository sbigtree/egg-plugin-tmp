import {createClient, RedisClientType} from 'redis';
import config from "../../config";
import logger from "../logger";
import {EventEmitter} from "events";


class RedisClient extends EventEmitter {
  public client: RedisClientType;
  public subscriber: RedisClientType;
  private SubscribeOn: boolean;
  private channelCallbacks: object;
  private _ready = false;
  private _readyCallbacks: Function[];
  private _readyError: Function | any

  constructor(host: string, port: string | number, password: string, db: string) {
    super()

    this.channelCallbacks = {}
    this._readyCallbacks = []
    this._readyError = null

    this.client = createClient({
      url: `redis://:${password}@${host}:${port}/${db}`
    });
    this.client.on('connect', err => {
      logger.info(`redis connect ${host}:${port}/${db}`, this.client.isReady, this.client.isOpen,)
      this.ready(true)
    })
    this.client.on('error', err => {
      logger.info(`redis error ${host}:${port}/${db}`, this.client.isReady, this.client.isOpen,)
    })
    this.client.on('reconnecting', err => {

      logger.warn(`redis reconnecting ${host}:${port}/${db}`, this.client.isReady, this.client.isOpen, Object.keys(this.channelCallbacks))
      this.subscriber?.disconnect()?.then(err => {
        logger.warn(`redis subscriber disconnect ${host}:${port}/${db}`)
      })
      this._initSubscribe()


    })
    // this.client.on('error', err => {
    //   // setTimeout(() => {
    //   //   // this.client.connect()
    //   //   // this._initSubscribe()
    //   // }, 3000)
    // });

  }

  _init() {
    this.client.connect()
  }

  ready(flagOrFunction?: any): Promise<any> | any {
    if (arguments.length === 0) {
      this._init()
      return new Promise<void>((resolve, reject) => {
        if (this._ready) {
          return resolve();
        } else if (this._readyError) {
          return reject(this._readyError);
        }
        // 首次调用, 保存回调方法
        this._readyCallbacks.push(err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
    } else if (typeof flagOrFunction === 'function') {
      this._readyCallbacks.push(flagOrFunction);
    } else if (flagOrFunction instanceof Error) {
      this._ready = false;
      this._readyError = flagOrFunction;
      if (!this._readyCallbacks.length) {
        this.emit('error', flagOrFunction);
      }
    } else {
      this._ready = flagOrFunction;
    }
    // 第二次调用，触发_readyCallbacks 相同首次调用promise
    if (this._ready || this._readyError) {
      this._readyCallbacks.splice(0, this._readyCallbacks.length).forEach(callback => {
        process.nextTick(() => {
          callback(this._readyError);
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
      logger.warn(`redis re subscriber`, channel)
      this.subscriber.subscribe(channel, callback)
    })
  }

  async subscribe(channel, callback) {
    if (!this.channelCallbacks[channel]) {
      if (!this.subscriber?.isOpen) {
        const subscriber = this.client.duplicate();
        this.subscriber = subscriber
        subscriber.on('error', err => {
          logger.info(`redis subscriber  error `, subscriber.isOpen, err)
        })
        subscriber.on('connect', () => {
          logger.info(`redis subscriber connect `, subscriber.isOpen)
        })
        subscriber.on('reconnecting', () => {
          logger.info(`redis subscriber reconnecting `, subscriber.isOpen)
        })
        subscriber.on('ready', () => {
          logger.info(`redis subscriber ready `, subscriber.isOpen)
        })
        subscriber.on('close', () => {
          logger.info(`redis subscriber close `, subscriber.isOpen)
        })
        await subscriber.connect()
      }
      // const subscriber = this.subscriber
      this.subscriber.subscribe(channel, (message, channel) => {
        callback()
      })
    }
    this.channelCallbacks[channel] = callback
    logger.debug(`redis subscriber  `, Object.keys(this.channelCallbacks))

  }

  /**
   *
   * @param key
   * @param value
   * @param ex 秒
   */
  async lock(key: string, value: string, ex: number): Promise<number> {
    // 加锁
    let lock = `
    if redis.call("setnx",KEYS[1],ARGV[1]) == 1 then
        redis.call("expire",KEYS[1],ARGV[2])
        return 1
    else
        return 0
    end
    `

    let res = await this.client.eval(lock, {arguments: [value.toString(), ex.toString()], keys: [key]})

    return res as number
  }


  async unlock(key, value = '1'): Promise<number> {
    // 解锁
    let unlock = `
    if redis.call("get",KEYS[1]) == ARGV[1] then
        return redis.call("del",KEYS[1])
    else
        return 0
    end
    `
    let res = await this.client.eval(unlock, {arguments: [value], keys: [key]})

    // @ts-ignore
    return res as number
  }
  async counter(key, name, step = 1) {
    // hmap {account:0}
    let script = `
    local step=tonumber(ARGV[2])
    if redis.call("exists",KEYS[1]) == 0 then
        redis.call("hset",KEYS[1],ARGV[1],step)
        return ARGV[2]
    else
       return redis.call("hincrby",KEYS[1],ARGV[1],step)
    end 
    `
    let res = await this.client.eval(script, {arguments: [name, step.toString()], keys: [key]})
    // let res = await this.client.evalRo(script, {arguments: [name, step], keys: [key]})

    // @ts-ignore
    return res as number
  }



}


export default {
  master: new RedisClient(config.redis.master.host, config.redis.master.port, config.redis.master.password, config.redis.master.db)
}
