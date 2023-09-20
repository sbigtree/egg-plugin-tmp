import path from "path";
import config from "@/config";
import log4js from "log4js";

const fs = require('fs');

const Logger = require('egg-logger').Logger;
const FileTransport = require('egg-logger').FileTransport;
const ConsoleTransport = require('egg-logger').ConsoleTransport;

// 日志路径
const logPath = path.join(config.logPath, 'app', config.name)
// if (!fs.existsSync(logPath)) {
//   fs.mkdirSync(logPath)
// }

fs.mkdirSync(logPath, {recursive: true})

log4js.configure({
  // pm2: true, // 需要安装 pm2 install pm2-intercom
  // pm2InstanceVar: 'INSTANCE_ID',
  disableClustering: true, //默认使用当前进程收集日志
  appenders: {
    default: {
      type: "file",
      maxLogSize: '10M',
      backups: 10,
      filename: path.join(logPath, 'log.log'),
      layout: {
        type: 'pattern',
        pattern: '%[[%d] [%p] [%f{2}:%l] %m'
      }
    },
    error: {
      type: "file",
      maxLogSize: '10M',
      backups: 10,
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
});

// const {createLogger, transports,format} = require('winston');


export function getLogger(name) {
  const logger = log4js.getLogger('default');
  logger.debug(name, 'login register'); // only output to stdout
  return logger
  // Enable exception handling when you create your logger.
  // const { combine, timestamp, label, printf } = format;
  //
  // const myFormat = printf(({ level, message, label, timestamp }) => {
  //   return `${timestamp} [${label}] ${level}: ${message}`;
  // });
  //
  // let logger2 = createLogger({
  //   format: combine(
  //     label({ label: 'right meow!' }),
  //     timestamp(),
  //     myFormat
  //   ),
  //   transports: [
  //     new transports.Console({level: 'debug'},),
  //     new transports.File({filename: path.join(logPath, 'log.log'), level: 'debug'}),
  //     new transports.File({
  //       filename: path.join(logPath, 'error.log'),
  //       level: 'error'
  //     })
  //   ],
  //   exceptionHandlers: [
  //     new transports.File({filename: path.join(logPath, 'exceptions.log')})
  //   ],
  //   handleExceptions: true,
  //   handleRejections: true
  // });

  // return logger
  // const logPath = path.join(config.logPath, 'name')
  // if (!fs.existsSync(logPath)) {
  //   fs.mkdirSync(logPath)
  // }
  //
  // const logger = new Logger();
  // logger.set('file', new FileTransport({
  //   file: path.join(logPath, 'log.log'),
  //   level: 'INFO',
  //   formatter(meta) {
  //     return `[${meta.date}] ${meta.message}`;
  //   },
  //   // ctx logger
  //   contextFormatter(meta) {
  //     return `[${meta.date}] [${meta.ctx.method} ${meta.ctx.url}] ${meta.message}`;
  //   },
  // }));
  // logger.set('console', new ConsoleTransport({
  //   level: 'DEBUG',
  //   formatter(meta) {
  //     return `[${meta.date}] ${meta.message}`;
  //   },
  //   // ctx logger
  //   contextFormatter(meta) {
  //     return `[${meta.date}] [${meta.ctx.method} ${meta.ctx.url}] ${meta.message}`;
  //   },
  // }));
  // logger.debug(name, 'login register'); // only output to stdout
  // // logger.info(name, 'info foo');
  // // logger.warn(name, 'warn foo');
  // // logger.error(name, new Error('error foo'));
  //
  // return logger

}


const logger = getLogger('app')

// process.on('unhandledRejection', err => {
//   logger.error(err)
//
// })
//
// process.on('uncaughtException', err => {
//   logger.trace(err)
// })


export default logger
