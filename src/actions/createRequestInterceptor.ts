import * as models from '../models';
import * as utils from '../utils';
import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import cloneDeep from 'lodash/cloneDeep';

export class CreateRequestInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  async beforeTrigger(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const context = hookContext.args[0];
    if (context.httpRegion.request && hookContext.index === 0) {
      utils.report(hookContext.arg, 'init request');
      context.request = cloneDeep(context.httpRegion.request);
    }
    return true;
  }
}
