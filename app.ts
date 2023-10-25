import redis from "@app/redis";
import {Controller, Application} from 'egg'
import init from "./app/index";

const assert = require('assert');

module.exports = async (app:Application) => {
  // require('app/controller/test')(app)
  // 将 static 中间件放到 bodyParser 之前
  // const index = app.config.coreMiddleware.indexOf('bodyParser');
  // assert(index >= 0, 'bodyParser 中间件必须存在');
  app.config.coreMiddleware.push('router');
  await redis.master.ready()
  await init(app)
  app.beforeStart(async () => {

  })
}
