export enum ResponseCode {
  OK = 0,  // 正常
  Fail = -1,  // 其他失败
  ServerError = 500,  // 其他失败
  // TmpError = 1000 // 自定义错误码

}

export interface ResponseModel {
  code: ResponseCode,
  data: any,
  message: any,

  [name: string]: any
}
