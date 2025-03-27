import redis from "@app/redis";

import * as EventHandler from './events/handler'
import {ChannelData} from "@app/type";
import {CHANNEL_KEY, RedisKeys} from "@app/redis/keys";
import logger, {Log} from "@app/logger";
import {AsyncQueue} from "@doctormckay/stdlib/data_structures";
import taskStore from "@app/store/taskStore";


// 多队列渠道
const KeyMap: any = {}
const subQueues = Object.keys(EventHandler).map(key => {
  const k = `${RedisKeys.TmpTaskTestQueue}_${key}`
  KeyMap[k] = key
  return k
})


async function taskRun(app, message: string, channel, cb = null) {

  const store = taskStore.get()
  // if (store.runningWorker > store.maxWorker) return // 总并发数大于100
  // 当前进程
  let _data = await redis.master.client.lPop(RedisKeys.TmpTaskTestQueue as any)
  if (!_data) return
  let data = JSON.parse(_data) as ChannelData
  const qKey = `${RedisKeys.TmpTaskTestQueue}_${data.key}`
  // 分发到子任务队列
  await redis.master.client.rPush(qKey, _data)
  subTaskRun(qKey, app)


}

async function subTaskRun(qkey, app) {
  const taskKey = KeyMap[qkey]
  const store = taskStore.get();

  (async () => {
    taskStore.add('runningWorker') // 全局worker
    taskStore.add(taskKey) // 任务计数
    const max = store[`max_${taskKey}`] || 50
    if (max && store[taskKey] > max) {
      // Log.task.warn('并发超上限', taskKey, `max ${max}`)
      return
    }
    // 取子任务
    let _data = await redis.master.client.lPop(qkey)
    if (!_data) {
      // Log.task.warn('未获取到任务', qkey)
      return
    }
    let data = JSON.parse(_data) as ChannelData
    const handler: (data, a: any) => Promise<any> = EventHandler[data.key]

    if (handler) {
      const len = await redis.master.client.lLen(qkey) || 0
      Log.task.info(process.pid, `总并发 ${store.runningWorker}`,'当前并发',taskKey, store[taskKey], '最大并发', max, '剩余任务', len)
      await handler(app, data).catch(err => {
        Log.task.error(err)
      }).finally(() => {
      })

      // const max = store[`max_${taskKey}`]||50
      // const len = await redis.master.client.lLen(qkey) || 0
      if (len && store[taskKey] < max) {
        setTimeout(() => {
          subTaskRun(qkey, app,)
        }, 1000)
      }
    } else {
      Log.task.warn('找不到任务', data.key)
    }
  })().finally(() => {
    taskStore.add('runningWorker', -1)
    taskStore.add(taskKey,-1) // 任务计数

  })

}


let ready = false

export default async function init(app) {
  if (ready) return
  ready = true
  const len = await redis.master.client.lLen(RedisKeys.TmpTaskTestQueue as any) || 0
  Log.task.info('任务数', len)


  setInterval(async () => {
    const queue = new AsyncQueue(async (i: any, callback) => {
      taskRun(app, '', '').finally(() => {
      }).finally(callback)
    }, 500)
    const len = await redis.master.client.lLen(RedisKeys.TmpTaskTestQueue as any) || 0
    // logger.info('队列数', len)
    const store = taskStore.get()
    const ml = Math.max(Math.min(store.maxWorker - store.runningWorker, len), 0)
    Log.task.info(`process ${process.pid} 当前进行中任务数`, store, '剩余', ml)
    for (let i = 0; i < 5000; i++) {
      queue.push(i)
    }
    subQueues.map(async qkey => {
      const taskKey = KeyMap[qkey]
      const max = store[`max_${taskKey}`] || 50
      const len = await redis.master.client.lLen(qkey) || 0
      const sl = Math.min(max - (store[taskKey] || 0), len)
      Log.task.info(`process ${process.pid}  ${qkey} 当前进行中任务数`, store[taskKey], '剩余', len)
      for (let i = 0; i < sl; i++) {
        subTaskRun(qkey, app)
      }
    })

  }, 10 * 1000)

  await redis.master.subscribe(CHANNEL_KEY, async (message: string, channel) => {
    // let data = JSON.parse(message) as ChannelData
    taskRun(app, message, channel)
  })


}
