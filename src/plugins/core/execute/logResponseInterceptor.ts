import { HookInterceptor, HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';
import * as utils from '../../../utils';

export class LogResponseInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  id = 'logResponse';
  async afterLoop(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const context = hookContext.args[0];
    let clone: models.HttpResponse | undefined;
    if (context.httpRegion.response) {
      clone = utils.cloneResponse(context.httpRegion.response);
      if (!clone.tags) {
        clone.tags = [];
      }
      clone.tags.push('httpRegion', context.isMainContext ? 'mainResponse' : 'refResponse');
      delete context.httpRegion.response;
    }
    await utils.logResponse(clone, context);
    return true;
  }
}
