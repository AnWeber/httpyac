import * as models from '../models';
import cloneDeep from 'lodash/cloneDeep';

export class CreateRequestInterceptor implements models.HookInterceptor<models.ProcessorContext, boolean | void> {
  async beforeTrigger(
    context: models.HookTriggerContext<models.ProcessorContext, boolean | undefined>
  ): Promise<boolean | undefined> {
    if (context.arg.httpRegion.request && context.index === 0) {
      context.arg.progress?.report?.({
        message: 'init request',
      });
      context.arg.request = cloneDeep(context.arg.httpRegion.request);
    }
    return true;
  }
}
