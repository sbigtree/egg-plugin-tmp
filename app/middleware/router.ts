import {Controller, Application, Context} from 'egg'


module.exports = (options, app) => {
  const _options = app.config.tmp;
  let graphiql = true;
  if (options.plugin_tmp === false) {
    graphiql = false;
  }

  // const {controller} = app;

  return async function (ctx: Context, next) {
    const {controller} = app;
    if (ctx.path === '/tmp') {

      // ctx.body = 'plugin test'
      return await controller.test.test()
    }


    await next.apply(ctx);

  }
}
