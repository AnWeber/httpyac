import * as models from '../../../models';
import { toNumber } from '../../../utils';

export function timeoutMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext) {
  const val = toNumber(value);
  if (type === 'timeout' && val !== undefined) {
    context.httpRegion.hooks.onRequest.addHook('timeout', async request => {
      request.timeout = val;
    });
    return true;
  }
  return false;
}
