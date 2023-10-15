import * as utils from '../../utils';
import { getKafkaMethod } from './kafkaMethods';
import { isKafkaRequest } from './kafkaRequest';
import { KafkaRequestClient } from './kafkaRequestClient';
import { userSessionStore } from '../../store';

export const parseKafkaLine = utils.parseRequestLineFactory({
  protocol: 'KAFKA',
  methodRegex: /^\s*(KAFKA)\s+(?<url>.+?)\s*$/u,
  requestClientFactory(request, context) {
    return new KafkaRequestClient(request, context);
  },
  modifyRequest(request) {
    request.supportsStreaming = true;

    if (isKafkaRequest(request)) {
      request.method = getKafkaMethod(request);
    }
  },
  sessionStore: userSessionStore,
});
