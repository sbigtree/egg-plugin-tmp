import {Application, Controller, Subscription} from "egg";
import {
  CsgoSteamPurchasePlanTable,
  PermissionTable,
  PermissionGroupRelTable,
  PermissionGroupTable,
  PermissionUserTable,
  CsgoSteamPurchaseBuyOrderTable,
  SteamAccountTable, SteamSweepConfigTable, Sequelize, Models,
} from "@sbigtree/db-model";
import * as EventHandler from '../events/handler'
import {EventKey} from '../events/keys'

import {Op, QueryTypes} from "sequelize";
import {AsyncQueue} from "@doctormckay/stdlib/data_structures";
import redis from "@app/redis";
import {RedisKeys, CHANNEL_KEY} from "@app/redis/keys";
import moment from "moment";

module.exports = class _Task extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      interval: '1m', // 1 分钟间隔
      type: 'worker', // 指定所有的 worker 都需要执行
      immediate: true,
      disable: true,

    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const app: any = this.app
    const sequelize: Sequelize = app.sequelize.default.client
    // 获取表模型
    const models: Models = app.sequelize.default.models
    // 获取收藏中的物品
    const permission = await models.PermissionTable.findOne({
      rejectOnEmpty: false,
      where: {
        permission: 'STEAM_APP_ASSET_SIFT'
      }
    })

    let sql = `select $id`

    // 5分钟同步一次
    const taskTime = moment().subtract(5, 'minutes').format('YYYY-MM-DD HH:mm:ss') // 任务启动时间
    // 获取扫货配置
    let users = await sequelize.query(sql,
      {
        bind: {id: permission.id, task_time: taskTime, expire_time: moment().format('YYYY-MM-DD HH:mm:ss')},
        type: QueryTypes.SELECT
      })

    // 检查账号余额 过滤出余额充足的号
    let queue = new AsyncQueue(async (conf: any, callback) => {
      await redis.master.client.rPush(RedisKeys.TmpTaskTestQueue, JSON.stringify({
        key: EventKey.TaskTest,
        data: {
          user_id: conf.user_id
        }
      }))
      await redis.master.client.publish(CHANNEL_KEY, '{}')
      callback()
    }, 1)

    users.map((item) => {
      queue.push(item)
    })

  }


}


