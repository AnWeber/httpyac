import { httpClientProvider } from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';
import { userSessionStore } from '../../../store';

export const parseHttpRequestLine = utils.parseRequestLineFactory({
  protocol: 'HTTP',
  methodRegex:
    /^\s*(?<method>GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE|PROPFIND|PROPPATCH|MKCOL|COPY|MOVE|LOCK|UNLOCK|CHECKOUT|CHECKIN|REPORT|MERGE|MKACTIVITY|MKWORKSPACE|VERSION-CONTROL|BASELINE-CONTROL|MKCALENDAR|ACL|SEARCH|GRAPHQL)\s+(?<url>.+?)$/u,
  protocolRegex: /^\s*(?<url>.+)\s*$/iu,
  requestClientFactory(request, context) {
    if (httpClientProvider.createRequestClient) {
      return httpClientProvider.createRequestClient(request, context);
    }
    throw new Error('Missing Http Client Provider');
  },
  modifyRequest(request) {
    if (request.method === 'HTTP') {
      request.method = 'GET';
    }
    if (utils.isHttpRequest(request)) {
      parseProtocol(request);
    }
  },
  sessionStore: userSessionStore,
});

function parseProtocol(request: models.HttpRequest) {
  if (request.url) {
    const match = /(?<url>.*)\s+HTTP\/(?<version>(\S+))/u.exec(request.url);
    if (match?.groups?.version && match.groups.url) {
      request.url = match.groups.url.trim();
      if (['1.1', '1.0'].indexOf(match.groups.version) < 0) {
        if (!request.options) {
          request.options = {};
        }
        request.options.http2 = true;
      }
    }
  }
}
