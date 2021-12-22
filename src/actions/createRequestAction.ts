import * as models from '../models';
import cloneDeep from 'lodash/cloneDeep';

export class CreateRequestInterceptor implements models.HookInterceptor<[models.ProcessorContext], boolean | void> {
  async beforeTrigger(
    hookContext: models.HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const context = hookContext.args[0];
    if (context.httpRegion.request && hookContext.index === 0) {
      context.progress?.report?.({
        message: 'init request',
      });
      context.request = cloneDeep(context.httpRegion.request);
    }
    return true;
  }
}
