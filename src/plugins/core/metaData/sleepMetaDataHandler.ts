import { javascriptProvider } from '../../../io';
import * as models from '../../../models';
import { report, sleep } from '../../../utils';

export function sleepMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext) {
  if (type === 'sleep' && value) {
    context.httpRegion.hooks.execute.addHook('sleep', async ctx => {
      const timeout = await javascriptProvider.evalExpression(value, ctx);
      if (Number.isSafeInteger(timeout)) {
        await report(ctx, `Sleep for ${timeout}ms`);
        await sleep(timeout as number);
      }
      return true;
    });
    return true;
  }
  return false;
}
