// This file is created by egg-ts-helper@1.35.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportTmp from '@appcontroller/tmp/v1/tmp';

declare module 'egg' {
  interface IController {
    tmp: ExportTmp;
  }
}
