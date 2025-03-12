import config from "../../config";
import {Client} from '@elastic/elasticsearch'
// const {Client} = require('@elastic/elasticsearch');
let esClient: Client = null

export async function init() {
  esClient = new Client({
    node: config.es.master.node,
    auth: {
      apiKey: config.es.master.apiKey
    }
  });

}

export default esClient
