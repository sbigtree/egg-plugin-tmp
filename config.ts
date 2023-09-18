import path from "path";

interface MysqlConfig {
  username: string,
  password: string,
  host: string,
  port: number,
  database: string,
}

interface RedisConfig {
  password: string,
  host: string,
  port: number,
  db: string,
}

interface Config {
  aesKey: string,
  secretKey: string,
  db: {
    [key: string]: MysqlConfig
  },
  redis: {
    [key: string]: RedisConfig

  },
  steamClientHost: string,
  serverHost: string
}

export default {
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
  steamClientHost: process.env.STEAM_CLIENT_HOST ?? '127.0.0.1:3006',
  serverHost: process.env.SERVER_HOST ?? '127.0.0.1:8088'


} as unknown as Config
