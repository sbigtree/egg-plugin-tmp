import {Controller, Application} from 'egg'

module.exports = (app: Application) => {
  class GraphqlService extends app.Service {

    async query(requestString) {
      const ctx = this.ctx;
    }
  }


}
