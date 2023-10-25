import { HookInterceptor, HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';

export class RequestDurationEndInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  id = 'requestDurationEnd';
  async afterLoop(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const context = hookContext.args[0];
    if (context.httpRegion.response && context.httpRegion.request?.start) {
      context.httpRegion.response.durationMillis = performance.now() - context.httpRegion.request.start;
    }
    return true;
  }
}
