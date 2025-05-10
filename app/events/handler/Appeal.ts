import config from '@/config'
import { HttpClient } from '@doctormckay/stdlib/http'
import { Models } from '@sbigtree/db-model'
import { Sequelize } from 'sequelize'
import { ChannelData } from '@app/type'
import redis from '@/app/redis'
import { RedisKeys } from '@app/redis/keys'
import { Log } from '@app/logger'
import { getProxy } from '@app/lib/proxy/proxy'
import { BandwidthUseFromType } from '@sbigtree/db-model/dist/models/proxy_user_bandwidth_use_from_day'
import { findTextBetween, LoginExpired, SteamHttpClient, SteamUrl } from '@sbigtree/steam-tools'
import SteamID from 'steamid'
import { LoginType } from '@sbigtree/steam-tools/dist/http/_SteamHttpClient'
import * as cheerio from 'cheerio'
import { SteamGiftAccountAppealStatus, SteamGiftAccountAppealTable } from '@sbigtree/db-model/dist/models/steam_gift_account_appeal'
import { stringToNumber } from '@app/lib/utils'

interface Params extends ChannelData {
  data: {
    steam_aid: number
  }
}

class Worker {
  private app: any
  private params: Params
  protected sequelize: Sequelize
  protected models: Models
  protected session: HttpClient
  private serviceId: any
  private playWalletUrl: string
  private client: SteamHttpClient
  private game: { appid: number; packageid: number }
  private user_id: any
  private appealTask: SteamGiftAccountAppealTable

  constructor(app, params: Params) {
    this.app = app
    this.params = params
    this.sequelize = app.sequelize.default.client
    // 获取表模型
    this.models = app.sequelize.default.models
    this.serviceId = ''
    this.session = new HttpClient({
      defaultHeaders: {}
    })
  }

  get logId() {
    return ''
  }

  async unlock() {
    await redis.master.unlock(RedisKeys.TmpUserCache, process.pid.toString())
  }

  async main() {
    // Log.default.info('EventKey 测试任务')
    let steam = await this.models.SteamAccountTable.findOne({
      where: {
        id: this.params.data.steam_aid
      }
    })
    this.user_id = steam.user_id
    let appealTask = await this.models.SteamGiftAccountAppealTable.findOne({
      where: {
        steam_aid: steam.id
      }
    })
    if (!appealTask) {
      return {
        success: false,
        message: '任务不存在'
      }
    }
    this.appealTask = appealTask
    if (appealTask.appeal_status != SteamGiftAccountAppealStatus.pending) {
      appealTask.message = '正在进行中，需要强制重启请强制启动任务'
      await appealTask.save()
      return {
        success: false,
        message: '请重置状态再操作'
      }
    }

    await this.models.SteamGiftAccountAppealTable.update(
      {
        appeal_status: SteamGiftAccountAppealStatus.process
      },
      {
        where: {
          steam_aid: this.params.data.steam_aid
        }
      }
    )
    // appealTask.appeal_status = SteamGiftAccountAppealStatus.process
    // await appealTask.save()

    let country = appealTask.country.toLowerCase()
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
    Log.default.info(steam.steam_account, proxy)
    let packaggeids = [1203649, 288522, 1049089, 84673]

    let appeal_type = 'gift' // self gift

    this.game = {
      appid: 3556740,
      packageid: 1255044
    }

    //  https://store.steampowered.com/app/3402530/Screen_Cat/?snr=1_7_7_7000_150_1
    //   https://store.steampowered.com/app/900270/Reventure/?snr=1_7_7_7000_150_1
    //     https://store.steampowered.com/app/2946030/ChooChoose/?snr=1_7_7_7000_150_1
    //       https://store.steampowered.com/app/418460/Rising_Storm_2_Vietnam/?snr=1_7_7_7000_150_1

    // fsick0648----fylbo55809 FVAEG-WYTJK-G2WRW

    // meqji9628----qefnm63081 LT8TR-BH7W9-EQT7M
    // hptdi4300----alfze77741 WBYGK-TE9YH-H4X88
    // trbuh0668----ymepg18213 0T8J2-DPIG6-DQB3I
    // fkjur3875----ufrlg65169 G493K-RX25D-INACG

    this.client = new SteamHttpClient({
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
        steam.refresh_token = this.client.refreshToken
        steam.access_token = this.client.accessToken
        steam.login_time = new Date()
        steam.online = 1
        steam.login_fail_msg = ''
        steam.login_eresult = null
        await steam.save()
      }
    })
    await this.client.checkLogin(SteamUrl.STORE_URL)
    await this.client.checkLogin(SteamUrl.STORE_HELP)

    const wallet = await this.client.AccountMarketDetail()

    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)) // 随机选一个 <= i 的索引
        ;[array[i], array[j]] = [array[j], array[i]] // 交换元素
      }
      return array
    }

    let redeemFlag = false
    if (wallet.data.balance_f == 0) {
      let codes = await this.models.SteamGiftAccountAppealWalletCodeTable.findAll({
        where: {
          user_id: steam.user_id,
          status: 0
        }
      })
      shuffle(codes)
      for (let i = 0; i < codes.length; i++) {
        const ret = await this.client.AccountRedeemFund(codes[i].wallet_code)
        if (ret.success) {
          if (ret.data.detail == 0) {
            codes[i].status = 1
            redeemFlag = true
            await codes[i].save()
            break
          } else if (ret.data.detail == 0) {
            codes[i].status = 1
          } else {
            codes[i].status = 1
          }
        }
      }
    } else {
      redeemFlag = true
    }
    if (!redeemFlag) {
      appealTask.appeal_status = SteamGiftAccountAppealStatus.pause
      await appealTask.save()
      return {
        success: false,
        message: '账号未充值'
      }
    }

    // await this.appeal(game)
    // 购买游戏
    const ret = await this.payGame(country, appeal_type)
    if (!ret.success) {
      appealTask.appeal_status = SteamGiftAccountAppealStatus.pause
      appealTask.message = ret.message
      await appealTask.save()
      return ret
    }
    // 申诉
    const ret2 = await this.appeal(this.game)
    if (!ret2.success) {
      appealTask.appeal_status = SteamGiftAccountAppealStatus.pause
      appealTask.message = ret.message
      await appealTask.save()
      return ret
    }
    appealTask.appeal_status = SteamGiftAccountAppealStatus.appealing
    appealTask.message = ret.message
    await appealTask.save()
    return ret2
  }

  // 意外终止
  async interrupt(msg) {
    await this.models.SteamGiftAccountAppealTable.update(
      {
        appeal_status: SteamGiftAccountAppealStatus.pause,
        message: msg
      },
      {
        where: {
          steam_aid: this.params.data.steam_aid
        }
      }
    )
  }

  async payGame(country, appeal_type) {
    await this.client.StoreDeleteCart()
    // for (let i = 0; i < appeal_type.length; i++) {
    // }
    const ret1 = await this.client.StoreAddCart(
      [
        {
          packageid: this.game.packageid,
          bundleid: null
        }
      ],
      country
    )

    if (!ret1.success) {
      return {
        success: false,
        message: '添加购物车失败'
      }
    }
    let resCart = await this.client.StoreCheckCart(country)
    if (!resCart.success) {
      return {
        success: false,
        message: '检查购物车失败'
      }
    }

    const retF = await this.client.AccountFriendList()

    const userinfo = await this.client.AccountGetStoreUserInfo()

    if (appeal_type == 'gift') {
      const ret1 = await this.client.StoreAddCart(
        [
          {
            packageid: this.game.packageid,
            bundleid: null
          }
        ],
        country
      )
      if (!ret1.success) {
        return {
          success: false,
          message: '添加购物车失败'
        }
      }
      let giftRes = await this.client.StoreModifyCartGiftItem({
        line_item_id: resCart.data.cart_items[0].line_item_id,
        user_country: userinfo.data.country_code,
        gift_info: {
          accountid_giftee: new SteamID(retF.data.friendslist.friends[0].ulfriendid).accountid
        },
        flags: {
          is_gift: true,
          is_private: false
        }
      })
      if (!giftRes.success) {
        return {
          success: false,
          message: '设置礼物接收人失败'
        }
      }
    }

    // const pay_mathod = 'steamaccount' // eclubpoints
    const pay_mathod = 'eclubpoints' // eclubpoints
    // Log.startGive.warn(this.logId, 'userinfo', userinfo)

    // let initRet0 = await client
    //   .StorePurchaseInit({
    //     country: userinfo.data.country_code,
    //     paymentMethod: 'steamaccount',
    //     bUseRemainingSteamAccount: 1
    //   })
    //   .catch((err) => {
    //     if (err instanceof LoginExpired) {
    //       return {
    //         success: false,
    //         data: {} as any,
    //         message: `登录过期，请重新登录steam账号 ${steam.steam_account}`
    //       }
    //     }
    //     throw err
    //   })
    // if (!initRet0.success) {
    //   return {
    //     success: false,
    //     message: '初始化订单失败'
    //   }
    // }

    let initRet1 = await this.client
      .StorePurchaseInit({
        country: userinfo.data.country_code,
        paymentMethod: pay_mathod,
        bUseRemainingSteamAccount: 1
      })
      .catch((err) => {
        if (err instanceof LoginExpired) {
          return {
            success: false,
            data: {} as any,
            message: `登录过期，请重新登录steam账号 ${this.client.options.account}`
          }
        }
        throw err
      })
    if (!initRet1.success) {
      return {
        success: false,
        message: '初始化订单失败'
      }
    }
    // {
    //   "success": 1,
    //   "purchaseresultdetail": 0,
    //   "paymentmethod": 35,
    //   "transid": "44583284758542775",
    //   "transactionprovider": 19,
    //   "paymentmethodcountrycode": "ID",
    //   "paypaltoken": "",
    //   "paypalacct": 0,
    //   "packagewitherror": -1,
    //   "appcausingerror": 0,
    //   "pendingpurchasepaymentmethod": 0,
    //   "authorizationurl": ""
    // }
    let priceInfo = await this.client.StoreGetfinalprice({
      transid: initRet1?.data?.transid
    })
    return {
      success: true
    }
    // success==2
    // http://support.steampowered.com/
    // 301 https://help.steampowered.com
    /**
     <a href="https://help.steampowered.com/id/wizard/HelpWithGame/?appid=3402530" class="help_wizard_button help_wizard_arrow_right">
     <img src="https://cdn.fastly.steamstatic.com/steamcommunity/public/images/apps/3402530/c7d8da8f30d74f02b8da64bdf8aee29e36fe6144.jpg">
     <span>
     Screen Cat							</span>
     </a>
     */
    // go https://help.steampowered.com/id/wizard/HelpWithGame/?appid=3402530
    // go https://help.steampowered.com/id/wizard/HelpWithTransaction/?transid=44583284758542775
    // go https://help.steampowered.com/id/wizard/HelpWithPurchaseIssue/?issueid=208&transid=44583284758542775

    /**
     post https://help.steampowered.com/id/wizard/AjaxCreateHelpRequest
     help_request_type 20
     help_issue 208
     transid
     validation_id 0
     validation_code
     steamid
     issue_text  Saya berharap layanan pelanggan dapat aktif membantu menyelesaikan masalah dengan transaksi hadiah, sehingga saya dapat menjaga kontak dekat dengan teman-teman saya lagi.
     sessionid
     wizard_ajax 1
     gamepad 0

     */
    // https://help.steampowered.com/id/wizard/HelpRequest/HT-G3H8-27XC-9N7Y
  }

  async appeal(game) {
    let url = 'https://help.steampowered.com'
    const retHelp = await this.client.httpClient.request({
      url: url,
      method: 'GET',
      followRedirects: true
    })

    const retHelpAppid = await this.client.httpClient.request({
      url: `https://help.steampowered.com/en/wizard/HelpWithGame/?appid=${game.appid}`,
      method: 'GET'
    })
    let $ = cheerio.load(retHelpAppid.textBody as string)
    const sessionid0 = findTextBetween(retHelpAppid.textBody, 'g_sessionID = "', '";')
    const hrefs = $('.help_wizard_button.help_wizard_arrow_right')
      .map((i, e) => {
        return $(e).attr('href')
      })
      .toArray()
    const href = hrefs.find((e) => e.includes('HelpWithTransaction'))
    if (!href) {
      return {
        success: false,
        message: '获取申诉链接失败'
      }
    }
    const wizard_url = this.getWizardURL(href)

    const retWizard = await this.client.httpClient.request({
      url: `https://help.steampowered.com/en/${wizard_url}`,
      method: 'GET',
      queryString: {
        sessionid: sessionid0,
        wizard_ajax: '1',
        gamepad: '0'
      }
    })

    // {
    //   "redirect": "https://help.steampowered.com/en/wizard/HelpWithMyPurchase?line_item=44583284758878656&transid=44583284758878655",
    //   "replace": true,
    //   "need_login": false
    // }
    if (retWizard.jsonBody?.need_login) {
      return {
        success: false,
        message: '登录过期'
      }
    }
    let retWizardRedirectBody = ''
    if (retWizard.jsonBody?.redirect) {
      const retWizardRedirect = await this.client.httpClient.request({
        url: retWizard.jsonBody.redirect,
        method: 'GET'
      })
      retWizardRedirectBody = retWizardRedirect.textBody
    } else if (retWizard.jsonBody?.html) {
      retWizardRedirectBody = retWizard.jsonBody?.html
    } else {
      return {
        success: false,
        message: '获取帮助信息失败'
      }
    }

    let $2 = cheerio.load(retWizardRedirectBody)

    const hrefs2 = $2('.help_wizard_button.help_wizard_arrow_right')
      .map((i, e) => {
        return $(e).attr('href')
      })
      .toArray()
    const href2 = hrefs2.find((e) => e.includes('issueid=208'))
    const wizard_url2 = this.getWizardURL(href)

    // const retWizardHref2 = await this.client.httpClient.request({
    //   url: `https://help.steampowered.com/en/${wizard_url2}`,
    //   method: 'GET',
    //   queryString: {
    //     sessionid: sessionid0,
    //     wizard_ajax: '1',
    //     gamepad: '0'
    //   }
    // })

    const retWizardHref3 = await this.client.httpClient.request({
      url: href2,
      method: 'GET',
      queryString: {
        sessionid: sessionid0,
        wizard_ajax: '1',
        gamepad: '0'
      }
    })
    let $3 = cheerio.load(retWizardHref3.textBody as string)

    if (retWizardHref3.jsonBody?.html) {
      $3 = cheerio.load(retWizardHref3.jsonBody?.html as string)
    } else {
    }
    const texts = await this.models.SteamGiftAccountAppealTextTable.findAll({
      where: {
        is_del: 0,
        user_id: this.user_id,
        country: this.appealTask.country
      }
    })
    let appeal_text = texts[Math.floor(Math.random() * texts.length)]

    // const sessionid = findTextBetween(retWizardHref3.textBody, 'g_sessionID = "', '";')
    const postData = {
      help_request_type: $3('input[name="help_request_type"]').val(),
      help_issue: $3('input[name="help_issue"]').val(),
      transid: $3('input[name="transid"]').val(),
      gid_line_item: $3('input[name="gid_line_item"]').val(),
      validation_id: $3('input[name="validation_id"]').val(),
      validation_code: $3('input[name="validation_id"]').val(),
      steamid: $3('input[name="steamid"]').val(),
      // issue_text: 'Saya harap layanan pelanggan dapat menangani kesalahan dari transaksi hadiah dalam waktu yang singkat mungkin dan memberikan saya solusi yang memuaskan'
      issue_text: appeal_text.appeal_text
    }
    // const parsedUrl = new URL(retWizard.jsonBody.redirect)
    // const transid = parsedUrl.searchParams.get('transid')
    const retAppeal = await this.client.httpClient.request({
      url: 'https://help.steampowered.com/en/wizard/AjaxCreateHelpRequest',
      method: 'post',
      urlEncodedForm: {
        ...postData,
        sessionid: sessionid0,
        wizard_ajax: '1',
        gamepad: '0'
      }
    })
    // {
    //   "success": 1,
    //   "next_page": "HelpRequest/?ticket=GpGG0ZjAfEawQY6PDVYuSUiLJERJJBq2VHGkyF%2BUA8jK%2BPaYEwY5jag82o6TU0EL"
    // }

    /**
     {
     "error": "You already have an existing help request for this issue. A duplicate request cannot be created."
     }
     */
    if (retAppeal.jsonBody.success == 1) {
      const ret = await this.client.httpClient.request({
        url: `https://help.steampowered.com/en/wizard/${retAppeal.jsonBody.next_page}`,
        method: 'GET',
        queryString: {
          sessionid: sessionid0,
          wizard_ajax: '1',
          gamepad: '0'
        }
      })
      /**
       {
       "redirect": "https://help.steampowered.com/en/wizard/HelpRequest/HT-WHC3-43FC-3QPD"
       }
       */
      console.log('postData')
      return {
        success: true
      }
    } else {
      if (retAppeal.jsonBody.error?.includes('You already have an existing help')) {
        return {
          success: true,
          message: '申诉成功'
        }
      }
      return {
        success: false,
        message: retAppeal.jsonBody.error
      }
    }
  }

  getWizardURL(href) {
    var base = 'https://help.steampowered.com/en/'
    // chop off base url if it's prefixed on the link

    var matches = href.match(/(wizard\/.*\?.*)/)
    if (matches) {
      return matches[1]
    } else if (href.length == 0 || href[0] == '?') {
      return 'Home' + href
    } else {
      return null
    }
  }
}

export async function Appeal(app, params: Params) {
  const sequelize: Sequelize = app.sequelize.default.client
  // 获取表模型
  const models: Models = app.sequelize.default.models

  const task = new Worker(app, params)
  return task
    .main()
    .then((res) => {})
    .catch((err) => {
      Log.default.error(err)
      task.interrupt(err.message)
      task.unlock()
      throw err
    })
}
