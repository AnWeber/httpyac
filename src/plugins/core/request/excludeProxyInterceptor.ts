import { HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';

export const excludeProxyInterceptor = {
  id: 'excludeProxy',
  afterLoop: async function excludeProxy(
    hookContext: HookTriggerContext<[models.Request, models.ProcessorContext], void>
  ): Promise<boolean> {
    const [request, context] = hookContext.args;
    if (!request.proxy) {
      request.proxy = context.config?.proxy;
    }

    if (request.proxy) {
      if (context.httpRegion.metaData.noProxy) {
        delete request.proxy;
      } else if (context.config?.proxyExcludeList) {
        if (context.config.proxyExcludeList.some(proxyExclude => request.url.startsWith(proxyExclude))) {
          delete request.proxy;
        }
      }
    }
    return true;
  },
};
