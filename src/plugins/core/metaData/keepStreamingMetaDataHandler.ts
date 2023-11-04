import { v4 as uuid } from 'uuid';

import * as models from '../../../models';
import { userSessionStore } from '../../../store';
import * as utils from '../../../utils';

export function keepStreamingMetaDataHandler(type: string, _value: string | undefined, context: models.ParserContext) {
  if (type === 'keepStreaming') {
    const id = `keep_streaming_${uuid()}`;
    context.httpRegion.hooks.onStreaming.addHook('keepStreaming', async (context: models.ProcessorContext) => {
      if (context.request) {
        utils.report(context, 'stream until manual cancellation');
        await new Promise(resolve => {
          if (context.requestClient) {
            context.requestClient.addEventListener('disconnect', () => resolve(true));
          }
        });
      }
    });
    context.httpRegion.hooks.onResponse.addHook('keepStreaming', () => {
      userSessionStore.removeUserSession(id);
    });
    return true;
  }
  return false;
}
