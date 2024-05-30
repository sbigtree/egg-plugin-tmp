import redis from "@app/redis";

import * as EventHandler from './events/handler'
import {ChannelData} from "@app/type";
import {CHANNEL_KEY, RedisKeys} from "@app/redis/keys";
import logger from "@app/logger";
import {AsyncQueue} from "@doctormckay/stdlib/data_structures";
import taskStore from "@app/store/taskStore";


async function taskRun(app, message: string, channel, cb = null) {
  (async () => {
    const store = taskStore.get()
    taskStore.add('runningWorker') // 全局worker
    if (store.runningWorker > 500) return // 并发数大于100
    // 当前进程
    let _data = await redis.master.client.lPop(RedisKeys.TmpTaskTestQueue as any)
    if (!_data) return
    let data = JSON.parse(_data) as ChannelData
    const handler: (data, a: any) => Promise<any> = EventHandler[data.key]
    if (handler) {
      taskStore.add(data.key) // 任务计数
      await handler(app, data).catch(err => {
        logger.error(err)
      }).finally(() => {
      })
      taskStore.add(data.key, -1)
    } else {
      logger.info('找不到任务', data.key)
    }
  })().finally(() => {
    taskStore.add('runningWorker', -1)
  })

}

let ready = false

export default async function init(app) {
  if (ready) return
  ready = true
  const len = await redis.master.client.lLen(RedisKeys.TmpTaskTestQueue as any) || 0
  logger.info('任务数', len)
  const queue = new AsyncQueue(async (i: any, callback) => {
    taskRun(app, '', '').finally(() => {
    }).finally(callback)
  }, 500)

  setInterval(async () => {
    const len = await redis.master.client.lLen(RedisKeys.TmpTaskTestQueue as any) || 0
    // logger.info('队列数', len)
    const store = taskStore.get()
    // logger.info(`process ${process.pid} 当前进行中任务数`, store)

    for (let i = 0; i < len; i++) {
      queue.push(i)
    }

  }, 10 * 1000)


  await redis.master.subscribe(CHANNEL_KEY, async (message: string, channel) => {
    // let data = JSON.parse(message) as ChannelData
    logger.debug(`${process.pid} subscribe `, channel)
    taskRun(app, message, channel)

  })

}
