import * as utils from '../../utils';
import { getAmqpMethod } from './amqpMethods/amqpConstants';
import { isAmqpRequest } from './amqpRequest';
import { AmqpRequestClient } from './amqpRequestClient';

export const parseAmqpLine = utils.parseRequestLineFactory({
  protocol: 'AMQP',
  methodRegex: /^\s*(amqp)\s*(?<url>.+?)\s*$/iu,
  protocolRegex: /^\s*amqp(s)?:\/\/(?<url>.+?)\s*$/iu,
  requestClientFactory(request, context) {
    return new AmqpRequestClient(request, context);
  },
  modifyRequest(request) {
    request.supportsStreaming = true;
    if (isAmqpRequest(request)) {
      request.method = getAmqpMethod(request);
    }
  },
});
