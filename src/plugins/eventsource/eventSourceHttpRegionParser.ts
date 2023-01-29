import * as utils from '../../utils';
import { EventSourceRequestClient } from './eventSourceRequestClient';

export const parseEventSource = utils.parseRequestLineFactory({
  protocol: 'SSE',
  methodRegex: /^\s*(sse|eventsource)\s*(?<url>.+?)\s*$/iu,
  requestClientFactory(request) {
    return new EventSourceRequestClient(request);
  },
  modifyRequest(request) {
    request.supportsStreaming = true;
  },
});
