import * as models from '../../models';
import * as utils from '../../utils';
import { toHttpResponse, getBody } from './gotUtils';

export async function logHttpRedirect(request: models.Request, context: models.ProcessorContext): Promise<void> {
  if (request && utils.isHttpRequest(request)) {
    if (!request.options.hooks) {
      request.options.hooks = {};
    }
    if (!request.options.hooks.beforeRedirect) {
      request.options.hooks.beforeRedirect = [];
    }
    if (!request.options.hooks.beforeRequest) {
      request.options.hooks.beforeRequest = [];
    }
    let currentRequest: undefined | models.Request;
    request.options.hooks.beforeRequest.push(options => {
      currentRequest = {
        protocol: 'HTTP',
        method: options.method,
        url: `${options.url}`,
        headers: options.headers,
        body: getBody(options.body),
      };
    });
    request.options.hooks.beforeRedirect.push(async (_options, response) => {
      const httpResponse = toHttpResponse(response);
      if (currentRequest) {
        httpResponse.request = currentRequest;
      }
      await utils.logResponse(httpResponse, context);
    });
  }
}
