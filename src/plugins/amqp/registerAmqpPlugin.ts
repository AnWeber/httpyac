import './completionItemProvider';
import '../grpc/completionItemProvider';

import * as amqpClient from '@cloudamqp/amqp-client';

import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { parseAmqpLine } from './amqpHttpRegionParser';
import { parseAmqpResponse } from './amqpResponseHttpRegionParser';

export function registerAmqpPlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('amqp', parseAmqpLine, { before: ['request'] });
  api.hooks.parse.addHook('amqpResponse', parseAmqpResponse, { before: ['requestBody'] });
  javascriptProvider.require['@cloudamqp/amqp-client'] = amqpClient;
}
