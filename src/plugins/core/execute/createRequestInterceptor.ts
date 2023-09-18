import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import cloneDeep from 'lodash/cloneDeep';

import * as models from '../../../models';
import * as utils from '../../../utils';

export class CreateRequestInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  id = 'createRequest';
  async beforeLoop(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const [context] = hookContext.args;
    if (context.httpRegion.request) {
      utils.report(context, 'init request');
      context.request = cloneDeep(context.httpRegion.request);
    }
    return true;
  }
}
