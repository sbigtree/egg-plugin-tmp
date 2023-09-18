import {EggAppConfig, EggAppInfo, PowerPartial} from 'egg';
import _config from "../config";
import {Sequelize,models} from '@sbigtree/db-model';
import initDB from '@sbigtree/db-model'


export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig>;

  // override config from framework / plugin
  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1694924995295_4795';

  // add your egg config in here
  // config.middleware = [];

  // add your special config in here
  const bizConfig = {
    sourceUrl: `https://github.com/eggjs/examples/tree/master/${appInfo.name}`,
  };

  // the return config will combines to EggAppConfig
  return {
    ...config,
    ...bizConfig,
    auth: {
      secret_key: _config.secretKey
    },
    sequelize: {
      Sequelize: Sequelize,
      initDB: initDB,
      models: models,
      test:'2',
      database: _config.db.default.database,
      host: _config.db.default.host,
      port: _config.db.default.port,
      username: _config.db.default.username,
      password: _config.db.default.password,
    },
  };
};
