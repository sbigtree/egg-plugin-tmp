import {Controller, Application} from 'egg'
import {QueryTypes} from "sequelize";
import {Sequelize, models, Models} from "@sbigtree/db-model";
import {ResponseCode, ResponseModel} from "@app/lib/type/req_res";


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

    this.ctx.body = {
      code: ResponseCode.OK,
      data: user1.id
    } as ResponseModel
  }
}


