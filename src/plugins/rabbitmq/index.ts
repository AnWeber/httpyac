import { javascriptProvider } from '../../io';
import * as models from '../../models';
import '../grpc/completionItemProvider';
import { parseAmqpLine } from './amqpHttpRegionParser';
import { parseAmqpResponse } from './amqpResponseHttpRegionParser';
import * as amqpClient from '@cloudamqp/amqp-client';

export function registerRabbitMQPlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('amqp', parseAmqpLine, { before: ['request'] });
  api.hooks.parse.addHook('amqpResponse', parseAmqpResponse, { before: ['requestBody'] });
  javascriptProvider.require['@cloudamqp/amqp-client'] = amqpClient;
}
