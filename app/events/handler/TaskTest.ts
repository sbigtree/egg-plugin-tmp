import config from "@/config";
import {HttpClient} from "@doctormckay/stdlib/http";
import {Models} from "@sbigtree/db-model";
import {Sequelize} from "sequelize";
import {ChannelData} from "@app/type";
import redis from "@/app/redis";
import {RedisKeys} from "@app/redis/keys";
import {Log} from "@app/logger";

interface Params extends ChannelData {
  data: {}
}


class Worker {
  private app: any;
  private params: Params;
  protected sequelize: Sequelize
  protected models: Models
  protected session: HttpClient
  private serviceId: any;
  private playWalletUrl: string;

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

  }
}

export async function TaskTest(app, params: Params) {
  const sequelize: Sequelize = app.sequelize.default.client
  // 获取表模型
  const models: Models = app.sequelize.default.models

  const task = new Worker(app, params)
  return task.main().then(res => {

  }).catch(err => {
    Log.default.error(err)
    task.unlock()
    throw err
  })

}
