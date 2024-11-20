import path from "path";
import config from "../../config";
import log4js, {Logger} from "log4js";
import {LogName} from "./name";

const fs = require('fs');
//
// const Logger = require('egg-logger').Logger;
// const FileTransport = require('egg-logger').FileTransport;
// const ConsoleTransport = require('egg-logger').ConsoleTransport;

// 日志路径
const logPathDir = path.join(config.logPath, 'app')
// if (!fs.existsSync(logPath)) {
//   fs.mkdirSync(logPath)
// }

fs.mkdirSync(logPathDir, {recursive: true})

const logConfig = {
  // pm2: true, // 需要安装 pm2 install pm2-intercom
  // pm2InstanceVar: 'INSTANCE_ID',
  disableClustering: true, //默认使用当前进程收集日志
  appenders: {
    default: {
      type: "dateFile",
      maxLogSize: '50M',
      backups: 100,
      pattern: "yyyy-MM-dd.log",
      filename: path.join(logPathDir, 'log'),
      alwaysIncludePattern: true,
      layout: {
        type: 'pattern',
        pattern: '%[[%d] [%p] [%f{2}:%l] %m'
      }
    },
    error: {
      type: "dateFile",
      maxLogSize: '50M',
      backups: 100,
      pattern: "yyyy-MM-dd.log",
      filename: path.join(config.logPath, 'error.log'),
      layout: {
        type: 'pattern',
        pattern: '%[[%d] [%p] [%f{4}:%l] %m'
      }
    },
    "just-errors": {
      type: "logLevelFilter",
      appender: "error",
      level: "error",
    },
    out: {
      type: "stdout",
      level: "debug",
      layout: {
        type: 'pattern',
        pattern: '%[[%d] [%p] [%f{4}:%l]  %F %m'
      }
    },
  },
  categories: {
    default:
      {
        appenders: ['out', 'just-errors', "default"],
        level: process.env.NODE_ENV == 'development' ? 'DEBUG' : 'INFO',
        enableCallStack: true
      },
  },
}
const logStore = {}

// 注册日志
registerLog(LogName.default)

log4js.configure(logConfig)

function registerLog(name) {
  const logPath = path.join(logPathDir, name,)
  fs.mkdirSync(logPath, {recursive: true})
  const categories = {}
  categories[name] = {
    appenders: ['out', name],
    level: process.env.NODE_ENV == 'development' ? 'DEBUG' : 'INFO',
    enableCallStack: true
  }
  const appender = {}
  appender[name] = {
    type: "dateFile",
    maxLogSize: '50M',
    pattern: "yyyy-MM-dd.log",
    alwaysIncludePattern: true,
    backups: 100,
    daysToKeep: 30,
    filename: path.join(logPath, 'log'),
    layout: {
      type: 'pattern',
      pattern: '%[[%d] [%p] [%f{2}:%l] %m'
    }
  }
  logConfig.appenders[name] = appender[name]
  logConfig.categories[name] = categories[name]
}


export function getLogger(name = 'default', configure?): Logger {
  // log4js.a
  const logger = log4js.getLogger(name);
  logger.debug(name, 'login register', name); // only output to stdout
  return logger


}


const logger = getLogger()

export const Log = {
  default: getLogger(LogName.default),
}
// process.on('unhandledRejection', err => {
//   logger.error(err)
//
// })
//
// process.on('uncaughtException', err => {
//   logger.trace(err)
// })

// export function getLogger() {
//
// }


export default logger
