import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { parseAmqpLine } from './amqpHttpRegionParser';
import * as amqpClient from '@cloudamqp/amqp-client';

export function registerRabbitMQPlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('amqp', parseAmqpLine, { before: ['request'] });
  javascriptProvider.require['@cloudamqp/amqp-client'] = amqpClient;
}
