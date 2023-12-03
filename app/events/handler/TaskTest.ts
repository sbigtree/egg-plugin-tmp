import {ChannelData} from "@app/type";

import {Op, QueryTypes} from "sequelize";
import {AsyncQueue} from "@doctormckay/stdlib/data_structures";
import moment from "moment";
import logger from "@app/logger";
import redis from "@app/redis";
import {RedisKeys} from "@app/redis/keys";
import {Models, Sequelize} from "@sbigtree/db-model";

interface Params extends ChannelData {
  data: {
    steam_aid: number
  }
}

export async function TaskTest(app, data: Params): Promise<{
  success: boolean,
  data?: any,
  message?: string
}> {
  const sequelize: Sequelize = app.sequelize.default.client
  // 获取表模型
  const models: Models = app.sequelize.default.models
  return
}
