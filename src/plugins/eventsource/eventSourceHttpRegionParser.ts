import * as utils from '../../utils';
import { EventSourceRequestClient } from './eventSourceRequestClient';

export const parseEventSource = utils.parseRequestLineFactory({
  protocol: 'SSE',
  methodRegex: /^\s*(SSE|EVENTSOURCE)\s+(?<url>.+?)\s*$/u,
  requestClientFactory(request) {
    return new EventSourceRequestClient(request);
  },
  modifyRequest(request) {
    request.supportsStreaming = true;
  },
});
