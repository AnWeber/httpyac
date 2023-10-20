import type { NormalizedOptions } from 'got';

import * as models from '../../models';
import { isHttpRequest } from '../../utils';

export function postRedirectGetMetaDataHandler(
  type: string,
  _value: string | undefined,
  context: models.ParserContext
) {
  if (type === 'postRedirectGet') {
    context.httpRegion.hooks.onRequest.addHook('postRedirectGet', async (request: models.Request) => {
      if (isHttpRequest(request)) {
        if (!request.options) {
          request.options = {};
        }
        if (!request.options.hooks) {
          request.options.hooks = {};
        }
        if (!request.options.hooks.beforeRedirect) {
          request.options.hooks.beforeRedirect = [];
        }
        request.options.hooks.beforeRedirect.push((options: NormalizedOptions) => {
          options.method = 'GET';
          options.body = undefined;
        });
      }
    });
    return true;
  }
  return false;
}
