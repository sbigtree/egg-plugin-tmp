import {EggAppConfig, EggAppInfo, PowerPartial} from 'egg';
import _config from "../config";
import {Sequelize, models} from '@sbigtree/db-model';
import initDB from '@sbigtree/db-model'
import nacos from "@app/nacos/index";


export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig>;

  // override config from framework / plugin
  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1694924995295_4795';

  // add your egg config in here
  // config.middleware = [];

  // @ts-ignore
  config.security = {csrf: {enable: false}}
  // add your special config in here
  const bizConfig = {
    sourceUrl: `https://github.com/eggjs/examples/tree/master/${appInfo.name}`,
  };
  // @ts-ignore
  config.logger = {
    appLogName: `app-web.log`,
    coreLogName: 'egg-web.log',
    agentLogName: 'egg-agent.log',
    errorLogName: 'common-error.log',
    dir: _config.logPath
  }

  // the return config will combines to EggAppConfig
  return {
    ...config,
    ...bizConfig,
    validate: {
      convert: true,
      // validateRoot: false,
    },
    multipart: {
      mode: 'file',
      fieldSize: '20mb',
      fileSize: '20mb',
      fields: 50,
      files: 50,
      allowArrayField: true,
      fileExtensions: ['.apk', '.txt']
    },
    routeAuth: {
      init: async () => {
        return {
          secret_key: _config.secretKey
        }
      }
    },
    sequelize: {
      Sequelize: Sequelize,
      initDB: initDB,
      models: models,
      init: async () => {
        await nacos.ready()
        return {
          dialect:'mariadb',
          database: _config.db.default.database,
          host: _config.db.default.host,
          port: _config.db.default.port,
          username: _config.db.default.username,
          password: _config.db.default.password,
          logging: process.env.NODE_ENV == 'development'
        }
      },
      test: '2',

    },
  };
};
