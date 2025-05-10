import { Controller, Application } from 'egg'
import { QueryTypes, Op } from 'sequelize'
import { Sequelize, models, Models } from '@sbigtree/db-model/dist'
import { ResponseCode, ResponseModel } from '@app/lib/type/req_res'
import redis from '@app/redis'
import { CHANNEL_KEY, RedisKeys } from '@app/redis/keys'
import { EventKey } from '@app/events/keys'
import { ESCsgoInventory } from '@sbigtree/db-model/dist/es_models/ESCsgoInventory'
import esClient from '@app/db/es'
import { SteamGiftAccountAppealStatus } from '@sbigtree/db-model/dist/models/steam_gift_account_appeal'
import { getProxy } from '@app/lib/proxy/proxy'
import { BandwidthUseFromType } from '@sbigtree/db-model/dist/models/proxy_user_bandwidth_use_from_day'
import { stringToNumber } from '@app/lib/utils'
import { findTextBetween, SteamHttpClient, SteamUrl } from '@sbigtree/steam-tools/dist'
import config from '@/config'
import { LoginType } from '@sbigtree/steam-tools/dist/http/_SteamHttpClient'
import * as cheerio from 'cheerio'

module.exports = class _ extends Controller {
  // 添加卡密
  async addWalletCode() {
    const params = this.ctx.request.body as {
      wallet_code: string
    }

    this.ctx.validate({
      wallet_code: { type: 'string', required: true }
    })

    const app: any = this.app

    const sequelize: Sequelize = app.sequelize.default.client
    // 获取表模型
    const models: Models = app.sequelize.default.models
    let list = params.wallet_code.replace(/\r/g, '').split('\n')
    list.map((e) => {
      models.SteamGiftAccountAppealWalletCodeTable.create({
        wallet_code: e,
        user_id: this.ctx.user.user_id,
        status: 0
      })
    })
    this.ctx.body = {
      code: ResponseCode.OK
    } as ResponseModel
  }

  // 添加任务
  async createTask() {
    let params = this.ctx.request.body as {
      origin_group_id: number
      done_group_id: number
      country: string // us 使用哪家的代理
      remark: string //
    }
    this.ctx.validate({
      origin_group_id: { type: 'number', required: true },
      done_group_id: { type: 'number', required: true },
      country: { type: 'string', required: false },
      remark: { type: 'string', required: false }
    })
    const app: any = this.app
    const sequelize: Sequelize = app.sequelize.default.client
    // 获取表模型
    const models: Models = app.sequelize.default.models

    const sourceSteams = await models.SteamAccountTable.findAll({
      where: {
        is_del: 0,
        user_id: this.ctx.user.user_id,
        group_id: params.origin_group_id
      }
    })

    const tasks = await models.SteamGiftAccountAppealTable.findAll({
      where: {
        is_del: 0,
        user_id: this.ctx.user.user_id,
        steam_aid: {
          [Op.in]: sourceSteams.map((e) => e.id)
        }
      }
    })
    const taskMap = {}
    tasks.map((b) => {
      taskMap[`${b.steam_aid}`] = b
    })
    let pending = 0
    const new_tasks = await Promise.all(
      sourceSteams.map(async (steam) => {
        if (taskMap[`${steam.id}`]) {
          pending += 1
          return
        }
        const task = await models.SteamGiftAccountAppealTable.create({
          user_id: steam.user_id,
          steam_aid: steam.id,
          appeal_status: SteamGiftAccountAppealStatus.pending,
          steam_account: steam.steam_account,
          done_group_id: params.done_group_id,
          country: params.country,
          remark: params.remark
        })
        return task
      })
    )

    this.ctx.body = {
      code: ResponseCode.OK,
      message: `添加成功，过滤重复任务${pending}`
    }
  }

  // 添加话术
  async addText() {
    let params = this.ctx.request.body as {
      text: string
      country: string
    }
    this.ctx.validate({
      country: { type: 'string', required: true },
      text: { type: 'string', required: true }
    })

    const app: any = this.app
    const sequelize: Sequelize = app.sequelize.default.client
    // 获取表模型
    const models: Models = app.sequelize.default.models

    params.text
      .replace(/\r/g, '')
      .split('\n')
      .map(async (e) => {
        if (e.trim()) {
          const task = await models.SteamGiftAccountAppealTextTable.create({
            user_id: this.ctx.user.user_id,
            country: params.country.toLowerCase(),
            appeal_text: e
          })
        }
      })

    this.ctx.body = {
      code: ResponseCode.OK,
      message: `添加成功`
    } as ResponseModel
  }

  // 重置任务
  async resetTask() {
    let params = this.ctx.request.body as {
      id: number
    }
    this.ctx.validate({
      id: { type: 'number', required: true }
    })

    const app: any = this.app
    const sequelize: Sequelize = app.sequelize.default.client
    // 获取表模型
    const models: Models = app.sequelize.default.models
    const task = await models.SteamGiftAccountAppealTable.findOne({
      where: {
        is_del: 0,
        user_id: this.ctx.user.user_id,
        id: params.id
      }
    })
    task.appeal_status = SteamGiftAccountAppealStatus.pending
    await task.save()
    this.ctx.body = {
      code: ResponseCode.OK,
      message: `重置成功`
    } as ResponseModel
  }

  // 启动单个任务
  async startTask() {
    let params = this.ctx.request.body as {
      id: number
      reset: number // 是否重置状态重新开始
    }
    this.ctx.validate({
      id: { type: 'number', required: true },
      reset: { type: 'number', required: false }
    })

    const app: any = this.app
    const sequelize: Sequelize = app.sequelize.default.client
    // 获取表模型
    const models: Models = app.sequelize.default.models
    const task = await models.SteamGiftAccountAppealTable.findOne({
      where: {
        is_del: 0,
        user_id: this.ctx.user.user_id,
        id: params.id
      }
    })
    if (params.reset) {
      task.appeal_status = SteamGiftAccountAppealStatus.pending
      await task.save()
    }
    if (task.appeal_status != SteamGiftAccountAppealStatus.pending) {
      this.ctx.body = {
        code: ResponseCode.Fail,
        message: `请重置任务再操作`
      } as ResponseModel
      return
    }

    const msg = [task]
      .filter((e) => e)
      .map((e) =>
        JSON.stringify({
          key: 'Appeal',
          data: {
            steam_aid: e.steam_aid
          }
        })
      )

    await redis.master.client.rPush(RedisKeys.SteamGiftAppealQueue, msg)
    // 推送任务
    await redis.master.client.publish(CHANNEL_KEY, '{}')
    this.ctx.body = {
      code: ResponseCode.OK,
      message: `启动成功，请刷新查看`
    } as ResponseModel
  }

  async startAllTask() {
    const tasks = await models.SteamGiftAccountAppealTable.findAll({
      where: {
        is_del: 0,
        user_id: this.ctx.user.user_id,
        appeal_status: {
          [Op.in]: [SteamGiftAccountAppealStatus.pending]
        }
      }
    })

    const msg = tasks
      .filter((e) => e)
      .map((e) =>
        JSON.stringify({
          key: 'Appeal',
          data: {
            steam_aid: e.steam_aid
          }
        })
      )
    if (!msg.length) {
      let message = '无待就绪任务可启动，请单个启动任务'
      this.ctx.body = {
        code: ResponseCode.Fail,
        message: message
      }
      return
    }

    await redis.master.client.rPush(RedisKeys.SteamGiftAppealQueue, msg)
    // 推送任务
    await redis.master.client.publish(CHANNEL_KEY, '{}')
    this.ctx.body = {
      code: ResponseCode.OK,
      message: `启动成功，请刷新查看`
    } as ResponseModel
  }

  async getTasks() {
    let params0: any = this.ctx.request.query
    this.ctx.validate(
      {
        page_index: { type: 'int', required: false, default: 1 },
        page_size: { type: 'int', required: false, default: 20 },
        status: { type: 'string', required: false, default: '-1' },
        account: { type: 'string', required: false, default: '' }
      },
      params0
    )
    let params = params0 as {
      page_index: number
      page_size: number
      status: string //
      account: string //
    }

    const app: any = this.app
    const sequelize: Sequelize = app.sequelize.default.client
    // 获取表模型
    const models: Models = app.sequelize.default.models
    let filter: any = {}
    if (params.account) {
      filter.steam_account = {
        [Op.like]: `${params.account}%`
      }
    }
    if (params.status && params.status != '-1') {
      filter.appeal_status = params.status
    }
    const total = await models.SteamGiftAccountAppealTable.count({
      where: Object.assign(
        {
          is_del: 0,
          user_id: this.ctx.user.user_id
        },
        filter
      )
    })
    const list = await models.SteamGiftAccountAppealTable.findAll({
      where: Object.assign(
        {
          is_del: 0,
          user_id: this.ctx.user.user_id
        },
        filter
      ),
      limit: params.page_size,
      offset: params.page_size * (params.page_index - 1),
      order: [['id', 'DESC']]
    })
    this.ctx.body = {
      code: ResponseCode.OK,
      data: { list: list.map((e) => e.toJSON()), total }
    }
  }

  async getText() {
    let params0: any = this.ctx.request.query
    this.ctx.validate(
      {
        page_index: { type: 'int', required: false, default: 1 },
        page_size: { type: 'int', required: false, default: 20 }
      },
      params0
    )
    let params = params0 as {
      page_index: number
      page_size: number
    }

    const app: any = this.app
    const sequelize: Sequelize = app.sequelize.default.client
    // 获取表模型
    const models: Models = app.sequelize.default.models
    let filter: any = {}

    const total = await models.SteamGiftAccountAppealTextTable.count({
      where: Object.assign(
        {
          is_del: 0,
          user_id: this.ctx.user.user_id
        },
        filter
      )
    })
    const list = await models.SteamGiftAccountAppealTextTable.findAll({
      where: Object.assign(
        {
          is_del: 0,
          user_id: this.ctx.user.user_id
        },
        filter
      ),
      limit: params.page_size,
      offset: params.page_size * (params.page_index - 1),
      order: [['id', 'DESC']]
    })
    this.ctx.body = {
      code: ResponseCode.OK,
      data: { list: list.map((e) => e.toJSON()), total }
    }
  }

  // 检查申诉
  async checkAppeal() {
    let params = this.ctx.request.query as {
      id: string
    }

    // this.ctx.validate(
    //   {
    //     id: { type: 'string', required: true }
    //   },
    //   params
    // )

    const app: any = this.app
    const sequelize: Sequelize = app.sequelize.default.client
    // 获取表模型
    const models: Models = app.sequelize.default.models
    const task = await models.SteamGiftAccountAppealTable.findOne({
      where: {
        is_del: 0,
        user_id: this.ctx.user.user_id,
        id: params.id
      }
    })
    let steam = await models.SteamAccountTable.findOne({
      where: {
        id: task.steam_aid
      }
    })
    let country = task.country.toLowerCase()
    let proxy = await getProxy(steam.steam_account, {
      user_id: steam.user_id,
      use_from: BandwidthUseFromType.steam_appeal,
      country: country,
      residence: true
    })
    let session = stringToNumber(steam.steam_account)
    // proxy.httpProxy = `http://a7777776-zone-custom-region-${country}-st-aceh-session-${steam.steam_account}-sessTime-120:uuytrrde@8ed1404626411188.gtz.as.ipidea.online:2336`

    // proxy.httpProxy = `http://tre0521_${session}-country-${country}-state-jb-city-bogor:qwertasdfg@proxysg.rola.vip:1000`
    proxy.socksProxy = `socks5://tre0521_${session}-country-${country}-state-jb-city-bogor:qwertasdfg@proxysg.rola.vip:1000`

    //
    const client = new SteamHttpClient({
      account: steam.steam_account,
      password: steam.steam_password,
      loginHost: config.yymApiHost,
      loginType: LoginType.client,
      loginUseProxy: true,
      httpProxy: proxy.httpProxy,
      socksProxy: proxy.socksProxy,
      // accessToken: steam.access_token,
      // refreshToken: steam.refresh_token,
      cookieList: JSON.parse(steam.cookie),
      // steamid: steam.steamid,
      // guard: JSON.parse(steam.guard),
      loginRefreshCallback: async (cookies) => {
        steam.cookie = cookies
        steam.refresh_token = client.refreshToken
        steam.access_token = client.accessToken
        steam.login_time = new Date()
        steam.online = 1
        steam.login_fail_msg = ''
        steam.login_eresult = null
        await steam.save()
      }
    })
    await client.checkLogin(SteamUrl.STORE_HELP)
    const ret = await client.httpClient.request({
      url: `https://help.steampowered.com/id/wizard/HelpRequests`,
      method: 'GET',
      queryString: {}
    })
    const sessionid0 = findTextBetween(ret.textBody, 'g_sessionID = "', '";')
    let $2 = cheerio.load(ret.textBody)
    let cs = $2('.help_request_row')
    if (cs.length === 0) {
      this.ctx.body = {
        code: ResponseCode.Fail,
        message: '案件获取失败'
      }
      return
    }
    let url = $2(cs[0]).attr('href')
    const ret2 = await client.httpClient.request({
      url: url,
      method: 'GET',
      queryString: {
        sessionid: sessionid0,
        wizard_ajax: '1',
        gamepad: '0'
      }
    })
    this.ctx.body = {
      code: ResponseCode.OK,
      data: ret2.jsonBody
    }
  }
}
