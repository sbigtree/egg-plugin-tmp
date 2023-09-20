import {createClient, RedisClientType} from 'redis';
import config from "../../config";
import logger from "@app/logger";


class RedisClient {
  public client: RedisClientType;
  private SubscribeOn: boolean;
  private channelCallbacks: object;

  constructor(host: string, port: string | number, password: string, db: string) {
    this.channelCallbacks = {}

    this.client = createClient({
      url: `redis://:${password}@${host}:${port}/${db}`
    });
    this.client.connect()
    this.client.on('connect', err => {
      logger.info(`redis connect ${host}:${port}/${db}`)

    })
    this.client.on('reconnecting', err => {
      logger.warn(`redis reconnecting ${host}:${port}/${db}`)
      this._initSubscribe()

    })
    this.client.on('error', err => {
      console.log(err)
      setTimeout(() => {
        // this.client.connect()
        // this._initSubscribe()
      }, 3000)
    });


  }

  _initSubscribe() {
    Object.keys(this.channelCallbacks).map(async (channel) => {
      const callback = this.channelCallbacks[channel]
      const subscriber = this.client.duplicate();
      await subscriber.connect()
      subscriber.subscribe(channel, (message, channel) => {
        callback(message, channel)
      })
    })
  }

  async subscribe(channel, callback) {
    if (!this.channelCallbacks[channel]) {
      const subscriber = this.client.duplicate();
      await subscriber.connect()
      subscriber.subscribe(channel, (message, channel) => {
        callback()
      })
    }
    this.channelCallbacks[channel] = callback

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

}


export default {
  master: new RedisClient(config.redis.master.host, config.redis.master.port, config.redis.master.password, config.redis.master.db)
}
