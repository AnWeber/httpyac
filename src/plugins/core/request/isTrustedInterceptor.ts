import * as io from '../../../io';
import * as models from '../../../models';
import { HookTriggerContext } from 'hookpoint';

export const isTrustedInterceptor = {
  afterLoop: async function escapeVariable(
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
