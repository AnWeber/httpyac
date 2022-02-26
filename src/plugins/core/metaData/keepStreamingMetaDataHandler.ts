import * as models from '../../../models';
import { userSessionStore } from '../../../store';
import * as utils from '../../../utils';
import { v4 as uuid } from 'uuid';

export function keepStreamingMetaDataHandler(type: string, _value: string | undefined, context: models.ParserContext) {
  if (type === 'keepStreaming') {
    const id = `keep_streaming_${uuid()}`;
    context.httpRegion.hooks.onStreaming.addHook('keepStreaming', async (context: models.ProcessorContext) => {
      if (context.request) {
        const streamSession: models.UserSession = {
          id,
          type: 'Stream',
          title: `${context.request.method} ${context.request.url}`,
          description: 'Pending Stream',
          details: context.request.headers || {},
        };
        utils.report(context, 'stream until manual cancellation');

        await new Promise(resolve => {
          userSessionStore.setUserSession(streamSession);
          const dispose = context.progress?.register?.(() => userSessionStore.removeUserSession(id));
          streamSession.delete = () => {
            dispose?.();
            resolve(true);
          };
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
