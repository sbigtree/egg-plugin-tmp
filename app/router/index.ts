import {Router, Application} from "egg";

module.exports = (app: Application) => {

  const auth = app.middleware.routeAuth()
  const {router, controller} = app;
  // const apiRouter: Router = app.router.namespace('/api/tmp/');

  router.get('/api/tmp/test/auth', auth, controller.tmp.test,)
  router.get('/api/tmp/test', controller.tmp.test)

}
