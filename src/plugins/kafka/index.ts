import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { parseKafkaLine } from './kafkaHttpRegionParser';
import { parseKafkaResponse } from './kafkaResponseHttpRegionParser';
import * as kafka from 'kafkajs';

export function registerKafkaPlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('kafka', parseKafkaLine, { before: ['request'] });
  api.hooks.parse.addHook('kafkaResponse', parseKafkaResponse, { before: ['requestBody'] });
  javascriptProvider.require.kafkajs = kafka;
}
