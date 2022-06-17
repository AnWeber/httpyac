import * as models from '../../models';
import * as utils from '../../utils';
import { toHttpResponse } from './gotUtils';

export async function logHttpRedirect(request: models.Request, context: models.ProcessorContext): Promise<void> {
  if (request && utils.isHttpRequest(request)) {
    if (!request.options.hooks) {
      request.options.hooks = {};
    }
    if (!request.options.hooks.beforeRedirect) {
      request.options.hooks.beforeRedirect = [];
    }
    request.options.hooks.beforeRedirect.push(async (_options, response) => {
      await utils.logResponse(toHttpResponse(response), context);
    });
  }
}
