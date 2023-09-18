// This file is created by egg-ts-helper@1.35.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportRouter from '../../../app/middleware/router';

declare module 'egg' {
  interface IMiddleware {
    router: typeof ExportRouter;
  }
}
