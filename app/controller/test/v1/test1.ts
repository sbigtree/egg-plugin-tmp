import { Controller, Application } from 'egg'
import { QueryTypes, Op } from 'sequelize'
import { Sequelize, models, Models } from '@sbigtree/db-model'
import { ResponseCode, ResponseModel } from '@app/lib/type/req_res'
import redis from '@app/redis'
import { CHANNEL_KEY, RedisKeys } from '@app/redis/keys'
import { EventKey } from '@app/events/keys'
import { ESCsgoInventory } from '@sbigtree/db-model/dist/es_models/ESCsgoInventory'
import esClient from '@app/db/es'

module.exports = class TmpController extends Controller {
  async test() {
    const app: any = this.app
    const sequelize: Sequelize = app.sequelize.default.client
    // 获取表模型
    const models: Models = app.sequelize.default.models
    let s = await models.UserTable.update(
      {
        remark: '181*****'
      },
      {
        returning: false,
        where: {
          id: 1
        }
      }
    )

    let user1 = await models.UserTable.findOne()

    // 执行原生sql
    const user2 = await sequelize.query('select * from user limit 1 offset 0', {
      type: QueryTypes.SELECT,
      plain: true
    })
    const suites = await esClient.client.search({
      index: ESCsgoInventory.index
    })

    this.ctx.body = {
      code: ResponseCode.OK,
      data: user1.remark
    } as ResponseModel
  }

  async auth() {
    const params = this.ctx.request.query as {
      // user_id: string
    }

    // this.ctx.validate({
    //   user_id: {type: 'int', required: true},
    //   receiver_steam_url: {type: 'string', required: true},
    //   point_ids: {type: 'array', required: true, itemType: 'int'},
    // })

    const app: any = this.app
    const user = this.ctx.user // {user_id:1}

    const sequelize: Sequelize = app.sequelize.default.client
    // 获取表模型
    const models: Models = app.sequelize.default.models
    models.UserTable
    let user1 = await models.UserTable.findOne({
      rejectOnEmpty: false,
      where: {
        id: user.user_id
      }
    })
    let steam = await models.SteamAccountTable.findOne({
      rejectOnEmpty: false,
      where: {
        id: user.user_id,
        cookie: {
          [Op.not]: null
        }
      }
    })
    const s = steam.cookie

    // 执行原生sql
    const user2 = await sequelize.query('select * from user limit 1 offset 0', {
      type: QueryTypes.SELECT,
      plain: true
    })

    this.ctx.body = {
      code: ResponseCode.OK,
      data: user1.id
    } as ResponseModel
  }

  async addQueueTask() {
    await redis.master.client.rPush(
      RedisKeys.SteamGiftAppealQueue,
      JSON.stringify({
        key: EventKey.Appeal,
        data: {
          user_id: 1
        }
      })
    )
    await redis.master.client.publish(CHANNEL_KEY, '{}')
    this.ctx.body = {
      code: ResponseCode.OK
    } as ResponseModel
  }
}
