import { log } from '../io';
import * as models from '../models';

export function registerCancelExecutionIntercepter(parserContext: models.ParserContext) {
  parserContext.httpRegion.hooks.execute.addInterceptor({
    beforeLoop: async function checkUserCancelation(
      context: models.HookTriggerContext<models.ProcessorContext, boolean>
    ) {
      if (context.arg.progress?.isCanceled?.()) {
        log.trace('processs canceled by user');
        return false;
      }
      return true;
    },
  });
}
