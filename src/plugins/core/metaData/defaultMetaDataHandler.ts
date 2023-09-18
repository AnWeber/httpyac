import { HookInterceptor, HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';

export class DefaultMetaDataHandler implements HookInterceptor<[string, string, models.ParserContext], boolean> {
  id = 'defaultMetaData';
  async afterLoop(
    hookContext: HookTriggerContext<[string, string, models.ParserContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    if (hookContext.results.every(obj => !obj)) {
      const [type, value, context] = hookContext.args;
      Object.assign(context.httpRegion.metaData || {}, {
        [type]: value || true,
      });
      hookContext.results.push(true);
    }
    return true;
  }
}
