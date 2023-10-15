import * as utils from '../../utils';
import { getAmqpMethod } from './amqpMethods/amqpConstants';
import { isAmqpRequest } from './amqpRequest';
import { AmqpRequestClient } from './amqpRequestClient';
import { userSessionStore } from '../../store';

export const parseAmqpLine = utils.parseRequestLineFactory({
  protocol: 'AMQP',
  methodRegex: /^\s*(AMQP)\s+(?<url>.+?)\s*$/u,
  protocolRegex: /^\s*(?<url>amqp(s)?:\/\/.+?)\s*$/iu,
  requestClientFactory(request, context) {
    return new AmqpRequestClient(request, context);
  },
  modifyRequest(request) {
    request.supportsStreaming = true;
    if (isAmqpRequest(request)) {
      request.method = getAmqpMethod(request);
    }
  },
  sessionStore: userSessionStore,
});
