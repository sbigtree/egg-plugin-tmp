process.env.REDIS_PORT = '30000'
console.log(process.env.REDIS_HOST)
import redis from "../app/redis";
import {CHANNEL_KEY, RedisKeys} from "../app/redis/keys";
import {EventKey} from "../app/events/keys";

async function main() {
  await redis.master.ready()

  await redis.master.client.rPush(RedisKeys.SteamBinderTaskQueue, JSON.stringify({
    key: EventKey.BindSda,
    data: {
      user_id: 13,
      steam_aid: 158,
      retry: 0,
    }
  }))
  await redis.master.client.publish(CHANNEL_KEY, '{}')
  console.log('发送成功')

}
