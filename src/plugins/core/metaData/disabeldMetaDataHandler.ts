import { HookTriggerContext } from 'hookpoint';
import * as models from '../../../models';

import * as io from '../../../io';
import { addSkippedTestResult } from '../../../utils';

export function disabledMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext) {
  if (type === 'disabled') {
    if (!value) {
      context.httpRegion.hooks.execute.addInterceptor({
        id: 'disabled',
        async beforeLoop(
          hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
        ): Promise<boolean | undefined> {
          hookContext.bail = true;
          const { httpRegion } = hookContext.args[0];
          addSkippedTestResult(httpRegion);
          return true;
        },
      });
    } else if (typeof value === 'string') {
      context.httpRegion.hooks.execute.addHook('disabled', async context => {
        const result = await io.javascriptProvider.evalExpression(value, context);
        if (result) {
          addSkippedTestResult(context.httpRegion);
        }
        return !result;
      });
    }
    return true;
  }
  return false;
}
