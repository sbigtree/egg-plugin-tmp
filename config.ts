import path from "path";

interface MysqlConfig {
  username: string,
  password: string,
  host: string,
  port: number,
  database: string,
}
interface EsConfig {
  node: string,
  apiKey: string,
}

interface RedisConfig {
  password: string,
  host: string,
  port: number,
  db: string,
}

interface Config {
  name: string,
  logPath: string,
  aesKey: string,
  secretKey: string,
  db: {
    [key: string]: MysqlConfig
  },
  es: {
    [key: string]: EsConfig
  },
  redis: {
    [key: string]: RedisConfig

  },
  yymSuperProxy: string,
  yymApiHost: string
}


export default {
  name: 'tmp', // 当前应用模块名称
  logPath: process.env.LOG_PATH ?? path.join(process.cwd(), 'logs'), // 日志目录
  aesKey: process.env.AES_CRYPT_KEY,
  secretKey: process.env.SECRET_KEY ?? '0123456789abcdef',
  db: {
    default: {
      username: process.env.DB_USER ?? 'momo',
      password: process.env.DB_PASSWORD ?? '%%%momo###',
      database: process.env.DB_NAME ?? 'steam_busi',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: process.env.DB_PORT ?? '3306',
    }
  },
  es: {
    master: {
      node: process.env.ES_NODE,
      apiKey: process.env.ES_APIKEY
    }
  },
  redis: {
    master: {
      password: process.env.REDIS_PASSWORD ?? 'tree',
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: process.env.REDIS_PORT ?? '6379',
      db: process.env.REDIS_DB ?? '5',
    },
    session: {
      password: process.env.REDIS_PASSWORD ?? 'tree',
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: process.env.REDIS_PORT ?? '6379',
      db: 2,
    },
  },
  yymSuperProxy: process.env.YYM_SUPER_PROXY ?? '127.0.0.1:11080',
  yymApiHost: process.env.YYM_API_HOST ?? '127.0.0.1:6001',


} as unknown as Config
