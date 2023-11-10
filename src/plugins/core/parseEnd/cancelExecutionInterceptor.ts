import { HookTriggerContext } from 'hookpoint';

import { log } from '../../../io';
import * as models from '../../../models';

export function registerCancelExecutionInterceptor(parserContext: models.ParserContext) {
  parserContext.httpRegion.hooks.execute.addInterceptor({
    id: 'cancel',
    beforeLoop: async function checkUserCancellation(
      hookContext: HookTriggerContext<[models.ProcessorContext], boolean>
    ) {
      const context = hookContext.args[0];
      if (context.progress?.isCanceled?.()) {
        log.debug('process canceled by user');
        return false;
      }
      return true;
    },
  });
}
