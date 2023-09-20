import {Controller} from "egg";
import redis from '@app/redis'
import {RedisKeys} from '@app/redis/keys'
import logger from "@applogger";


module.exports = class TmpRedisController extends Controller {

  async test() {
    const key = RedisKeys.TmpUserCache.replace('{user_id}', this.ctx.user.user_id)
    await redis.master.client.set(key, '1', {EX: 60})
    await redis.master.client.get(key,)
    logger.info('test')
  }
}
