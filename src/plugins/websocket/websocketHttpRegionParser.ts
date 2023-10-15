import * as utils from '../../utils';
import { WebsocketRequestClient } from './websocketRequestClient';
import { userSessionStore } from '../../store';

export const parseWebsocketLine = utils.parseRequestLineFactory({
  protocol: 'WS',
  methodRegex: /^\s*(WS|WSS|WEBSOCKET)\s+(?<url>.+?)\s*$/u,
  protocolRegex: /^\s*(?<url>ws(s)?:\/\/.+?)\s*$/iu,
  requestClientFactory(request, context) {
    return new WebsocketRequestClient(request, context);
  },
  modifyRequest(request) {
    request.supportsStreaming = true;
  },
  sessionStore: userSessionStore,
});
