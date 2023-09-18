import {Controller, Application} from 'egg'
import {QueryTypes} from "sequelize";
import {Sequelize, models, Models} from "@sbigtree/db-model";


module.exports = class TmpController extends Controller {

  async test() {
    const app: any = this.app
    const sequelize: Sequelize = app.sequelize.default.client
    // 获取表模型
    const models: Models = app.sequelize.default.models
    models.UserTable
    let user1 = await models.UserTable.findOne()

    // 执行原生sql
    const user2 = await sequelize.query('select * from user limit 1 offset 0', {
      type: QueryTypes.SELECT,
      plain: true
    })

    this.ctx.body = user1.toJSON()
  }

  async auth() {
    const app: any = this.app
    const sequelize: Sequelize = app.sequelize.default.client
    // 获取表模型
    const models: Models = app.sequelize.default.models
    models.UserTable
    let user1 = await models.UserTable.findOne()

    // 执行原生sql
    const user2 = await sequelize.query('select * from user limit 1 offset 0', {
      type: QueryTypes.SELECT,
      plain: true
    })

    this.ctx.body = user1.toJSON()
  }
}


