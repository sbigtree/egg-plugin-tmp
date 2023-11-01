import config from "../../config";
import {Client} from '@elastic/elasticsearch'
// const {Client} = require('@elastic/elasticsearch');
const esClient = new Client({
  node: config.es.master.node,
  auth: {
    apiKey: config.es.master.apiKey
  }
});

export default esClient
