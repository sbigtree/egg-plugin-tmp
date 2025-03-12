import {NacosConfigClient, NacosNamingClient} from 'nacos';
import {Log} from "@app/logger";
import config from "@/config";   // ts
import {Application} from 'egg'
import Base from 'sdk-base'

const logger = Log.default as any;


class Nacos extends Base {
  private nameClient: NacosNamingClient;
  private configClient: NacosConfigClient;

  constructor(options = {}) {
    super(Object.assign({},  options, {initMethod: '_init'}));
    this.nameClient = new NacosNamingClient({
      logger,
      serverList: config.nacosHost, // replace to real nacos serverList
      namespace: config.namespace,
      username: config.nacosUserName,
      password: config.nacosPassword
    });
    this.configClient = new NacosConfigClient({
      namespace: config.namespace,
      serverAddr: config.nacosHost,
      username: config.nacosUserName,
      password: config.nacosPassword
    });
  }

  async _init() {

    await this.nameClient.ready();
    await this.initConfig()
  }

  async initConfig() {

    const res = await this.configClient.getConfig(config.configId, 'DEFAULT_GROUP')
    const c = JSON.parse(res)
    config.aesKey = c.AES_CRYPT_KEY
    config.secretKey = c.SECRET_KEY
    config.db.default.username = c.DB_USER
    config.db.default.password = c.DB_PASSWORD
    config.db.default.database = c.DB_NAME
    config.db.default.host = c.DB_HOST
    config.db.default.port = c.DB_PORT
    config.es.master.node = c.ES_NODE
    config.es.master.apiKey = c.ES_APIKEY
    config.redis.master.password = c.REDIS_PASSWORD
    config.redis.master.host = c.REDIS_HOST
    config.redis.master.port = c.REDIS_PORT
    config.redis.master.db = c.REDIS_DB
    config.redis.session.password = c.REDIS_PASSWORD
    config.redis.session.host = c.REDIS_HOST
    config.redis.session.port = c.REDIS_PORT
    config.redis.session.db = '2'
    config.yymSuperProxy = c.YYM_SUPER_PROXY
    config.yymApiHost = c.YYM_API_HOST
  }

  async registerInstance(app) {
    await this.nameClient.registerInstance(config.name, {
      ip: config.damainHost,
      port: app.options.port,
      enabled: true,
      healthy: true,
      instanceId: "",
    });
  }
}

const nacos = new Nacos()


export default nacos
