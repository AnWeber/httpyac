import { HookTriggerContext } from 'hookpoint';

import * as io from '../../../io';
import * as models from '../../../models';

export const isTrustedInterceptor = {
  id: 'isTrusted',
  afterLoop: async function isTrusted(
    hookContext: HookTriggerContext<[models.Request, models.ProcessorContext], void>
  ): Promise<boolean> {
    if (!io.userInteractionProvider.isTrusted()) {
      const [request] = hookContext.args;
      return await io.userInteractionProvider.showNote(
        `Is call to ${request.method} ${request.url} allowed, because workspace is not trusted.`
      );
    }
    return true;
  },
};
