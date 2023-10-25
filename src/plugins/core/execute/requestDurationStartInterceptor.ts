import { HookInterceptor, HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';

export class RequestDurationStartInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  id = 'requestDurationStart';
  async beforeLoop(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const [context] = hookContext.args;
    if (context.httpRegion.request) {
      context.httpRegion.request.start = performance.now();
    }
    return true;
  }
}
