import {Controller, Application} from 'egg'
import {QueryTypes} from "sequelize";
import {Sequelize, models, Models} from "@sbigtree/db-model";
import {ResponseCode, ResponseModel} from "@app/lib/type/req_res";
import redis from "@app/redis";
import {CHANNEL_KEY, RedisKeys} from "@app/redis/keys";
import {EventKey} from "@app/events/keys";


module.exports = class TmpController extends Controller {

  async test() {
    const app: any = this.app
    const sequelize: Sequelize = app.sequelize.default.client
    // 获取表模型
    const models: Models = app.sequelize.default.models
    let s = await models.UserTable.update({
      remark: '181*****',
    }, {
      returning: false,
      where: {
        id: 1
      }
    })

    let user1 = await models.UserTable.findOne()

    // 执行原生sql
    const user2 = await sequelize.query('select * from user limit 1 offset 0', {
      type: QueryTypes.SELECT,
      plain: true
    })

    this.ctx.body = {
      code: ResponseCode.OK,
      data: user1.remark
    } as ResponseModel
  }

  async auth() {
    const params = this.ctx.request.body as {
      user_id: number
    }

    this.ctx.validate({
      steam_aid: {type: 'int', required: true},
      receiver_steam_url: {type: 'string', required: true},
      point_ids: {type: 'array', required: true, itemType: 'int'},
    })

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

  async addQueueTask(){
    await redis.master.client.rPush(RedisKeys.TmpTaskTestQueue, JSON.stringify({
      key: EventKey.TaskTest,
      data: {
        user_id: 1
      }
    }))
    await redis.master.client.publish(CHANNEL_KEY, '{}')
    this.ctx.body = {
      code: ResponseCode.OK,
    } as ResponseModel
  }
}


