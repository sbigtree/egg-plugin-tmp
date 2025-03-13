import config from "../../config";
import {Client} from '@elastic/elasticsearch'
// const {Client} = require('@elastic/elasticsearch');

type GetConfig = () => { node: string, apiKey: string }

class ESClient {
  public client: Client;
  private _ready = false;
  private _didInit = false; // 是否调用了init方法
  private _readyCallbacks: ((err?: Error) => void)[];
  private _readyError: Error | null;
  private _getConfig: GetConfig;

  constructor() {
    this._readyCallbacks = []
    this._readyError = null
    this._didInit = false
    this._ready = false

  }

  _init() {
    if (this._didInit) return
    this._didInit = true
    this.client = new Client({
      node: config.es.master.node,
      auth: {
        apiKey: config.es.master.apiKey
      }
    });
    this.ready(true)
  }

  async ready(flag?: boolean) {
    if (arguments.length === 0) {
      return new Promise<void>((resolve, reject) => {
        if (this._ready) {
          return resolve();
        } else if (this._readyError) {
          return reject(this._readyError);
        }
        this._readyCallbacks.push(err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
        this._init()
      });
    } else {
      this._ready = flag
      if (!this._ready) throw new Error('初始化失败')
    }
    if (this._ready || this._readyError) {
      this._readyCallbacks.splice(0, this._readyCallbacks.length).forEach(callback => {
        process.nextTick(() => {
          callback(this._readyError);
        });
      });
    }


  }
}

const client = new ESClient()


export default client
