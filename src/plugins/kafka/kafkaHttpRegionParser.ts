import * as utils from '../../utils';
import { getKafkaMethod } from './kafkaMethods';
import { isKafkaRequest } from './kafkaRequest';
import { KafkaRequestClient } from './kafkaRequestClient';

export const parseKafkaLine = utils.parseRequestLineFactory({
  protocol: 'KAFKA',
  methodRegex: /^\s*(kafka)\s*(?<url>.+?)\s*$/iu,
  requestClientFactory(request, context) {
    return new KafkaRequestClient(request, context);
  },
  modifyRequest(request) {
    request.supportsStreaming = true;

    if (isKafkaRequest(request)) {
      request.method = getKafkaMethod(request);
    }
  },
});
