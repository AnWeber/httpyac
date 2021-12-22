import { log } from '../io';
import * as models from '../models';

export function registerCancelExecutionInterceptor(parserContext: models.ParserContext) {
  parserContext.httpRegion.hooks.execute.addInterceptor({
    beforeLoop: async function checkUserCancellation(
      hookContext: models.HookTriggerContext<[models.ProcessorContext], boolean>
    ) {
      const context = hookContext.args[0];
      if (context.progress?.isCanceled?.()) {
        log.trace('process canceled by user');
        return false;
      }
      return true;
    },
  });
}
