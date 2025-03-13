import {Router, Application} from "egg";

module.exports = (app: Application) => {

  const auth = app.middleware.routeAuth({},app)
  const {router, controller} = app;
  // const apiRouter: Router = app.router.namespace('/api/tmp/');
  // 路由命名规范
  // /api + /当前模块名 + /控制器名称 + /版本 + /方法名
  // 如 /api/tmp/test/v1/auth
  // 当前模块名为tmp 控制器名为test, 一般是目录名，多级目录以此类推，auth为方法名
  router.get('/api/tmp/test/v1/auth', auth, controller.test.v1.test1.auth,)
  router.get('/api/tmp/test/v1/test', controller.test.v1.test1.test)
  router.get('/api/tmp/test/v1/addQueueTask', controller.test.v1.test1.addQueueTask)

}
