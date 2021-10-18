import * as models from '../../models';
import { sleep, evalExpression } from '../../utils';

export function sleepMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext) {
  if (type === 'sleep' && value) {
    context.httpRegion.hooks.execute.addHook('sleep', async ctx => {
      const timeout = await evalExpression(value, ctx);
      if (Number.isSafeInteger(timeout)) {
        await sleep(timeout as number);
      }
      return true;
    });
    return true;
  }
  return false;
}
