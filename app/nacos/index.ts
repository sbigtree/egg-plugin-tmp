import {NacosConfigClient, NacosNamingClient} from 'nacos';
import {Log} from "@app/logger";
import config from "@/config";   // ts
import {Application} from 'egg'
import Base from 'sdk-base'
import {decryptAES} from "@sbigtree/db-model";

const logger = Log.default as any;


class Nacos extends Base {
  private nameClient: NacosNamingClient;
  private configClient: NacosConfigClient;

  constructor(options = {}) {
    super(Object.assign({}, options, {initMethod: '_init'}));
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

  getValue(value, env): any {
    if (typeof value == 'string') {
      const r = /^\{e\}(.*)/.exec(value)
      if (r) {
        const key = config.configAesKey
        value = decryptAES(r[1], Buffer.from(key, 'base64'), 'base64')
        process.env[env] = value
        return value
      }
    }
    process.env[env] = value
    return value
  }

  async initConfig() {

    const res = await this.configClient.getConfig(config.configId, 'DEFAULT_GROUP')
    const c = JSON.parse(res)
    config.aesKey = this.getValue(c.AES_CRYPT_KEY, 'AES_CRYPT_KEY')
    config.secretKey = this.getValue(c.SECRET_KEY,'SECRET_KEY')
    config.db.default.username = this.getValue(c.DB_USER,'DB_USER')
    config.db.default.password = this.getValue(c.DB_PASSWORD,'DB_PASSWORD')
    config.db.default.database = this.getValue(c.DB_NAME,'DB_NAME')
    config.db.default.host = this.getValue(c.DB_HOST,'DB_HOST')
    config.db.default.port = this.getValue(c.DB_PORT,'DB_PORT')
    config.es.master.node = this.getValue(c.ES_NODE,'ES_NODE')
    config.es.master.apiKey = this.getValue(c.ES_APIKEY,'ES_APIKEY')
    config.redis.master.password = this.getValue(c.REDIS_PASSWORD,'REDIS_PASSWORD')
    config.redis.master.host = this.getValue(c.REDIS_HOST,'REDIS_HOST')
    config.redis.master.port = this.getValue(c.REDIS_PORT,'REDIS_PORT')
    config.redis.master.db = this.getValue(c.REDIS_DB,'REDIS_DB')
    config.redis.session.password = this.getValue(c.REDIS_PASSWORD,'REDIS_PASSWORD')
    config.redis.session.host = this.getValue(c.REDIS_HOST,'REDIS_HOST')
    config.redis.session.port = this.getValue(c.REDIS_PORT,'REDIS_PORT')
    config.redis.session.db = '2'
    config.yymSuperProxy = this.getValue(c.YYM_SUPER_PROXY,'YYM_SUPER_PROXY')
    config.yymApiHost = this.getValue(c.YYM_API_HOST,'YYM_API_HOST')

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
