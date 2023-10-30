import { HookInterceptor, HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';
import * as utils from '../../../utils';

export class LogResponseInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  id = 'logResponse';
  async afterLoop(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const context = hookContext.args[0];
    if (context.httpRegion.response) {
      const cloneResponse = utils.cloneResponse(context.httpRegion.response);
      if (!cloneResponse.tags) {
        cloneResponse.tags = [];
      }
      cloneResponse.tags.push('httpRegion', context.isMainContext ? 'mainResponse' : 'refResponse');
      await utils.logResponse(cloneResponse, context);
      delete context.httpRegion.response;
    }
    return true;
  }
}
