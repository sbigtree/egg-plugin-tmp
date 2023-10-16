import redis from "@app/redis";

import * as EventHandler from './events/handler'
import initDB from '@sbigtree/db-model'
import {ChannelData} from "@app/type";
import {CHANNEL_KEY, RedisKeys} from "@app/redis/keys";
import logger from "@app/logger";


export default async function init(app) {

  await redis.master.subscribe(CHANNEL_KEY, async (message: string, channel) => {
    // let data = JSON.parse(message) as ChannelData
    let _data = await redis.master.client.lPop(RedisKeys.TmpTaskTestQueue as any)
    // logger.debug(_data)
    if (!_data) return
    let data = JSON.parse(_data) as ChannelData
    const handler: (data, a: any) => Promise<any> = EventHandler[data.key]
    if (handler) {
      handler(app, data).catch(err => {
        logger.error(err)
      })
    }

  })

}
