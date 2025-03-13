import redis from "@app/redis";
import {Controller, Application} from 'egg'
import init from "./app/index";
import nacos from "./app/nacos";
import esClient from "./app/db/es";

const assert = require('assert');


// app.js 或 agent.js
class AppBootHook {
  private app: any;

  constructor(app) {
    this.app = app;
  }

  configWillLoad() {
    // 准备调用 configDidLoad，
    // 配置文件和插件文件将被引用，
    // 这是修改配置的最后机会。
    console.log('准备调用 configDidLoad')


  }

  configDidLoad() {
    // 配置文件和插件文件已被加载。
    console.log('配置文件和插件文件已被加载')


  }

  async didLoad() {
    // 所有文件已加载，这里开始启动插件。
    console.log('开始启动插件')
    await nacos.ready()
    console.log('nacos 初始化完成')

  }

  async willReady() {
    // 所有插件已启动，在应用准备就绪前可执行一些操作。
    console.log('启动插件完成，准备初始化')
    this.app.config.coreMiddleware.push('router');
    await redis.master.ready()
    await esClient.ready()
    await init(this.app)
  }

  async didReady() {
    // worker 已准备就绪，在这里可以执行一些操作，
    // 这些操作不会阻塞应用启动。
    await nacos.registerInstance(this.app)
  }

  async serverDidReady() {
    // 服务器已开始监听。
  }

  async beforeClose() {
    // 应用关闭前执行一些操作。
  }
}

module.exports = AppBootHook;


// module.exports = async (app: Application) => {
//   // require('app/controller/test')(app)
//   // 将 static 中间件放到 bodyParser 之前
//   // const index = app.config.coreMiddleware.indexOf('bodyParser');
//   // assert(index >= 0, 'bodyParser 中间件必须存在');
//   app.config.coreMiddleware.push('router');
//
//
//   app.beforeStart(async () => {
//     await init_nacos(app)
//     await redis.master.ready()
//     await init(app)
//
//   })
//   app.ready(async () => {
//   })
// }
