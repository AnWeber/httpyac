import * as models from '../../models';
import { userSessionStore } from '../../store';
import * as utils from '../../utils';

export function keepStreamingMetaDataHandler(type: string, _value: string | undefined, context: models.ParserContext) {
  if (type === 'keepStreaming') {
    context.httpRegion.hooks.onStreaming.addHook('keepStreaming', async (context: models.ProcessorContext) => {
      if (context.request) {
        const streamSession: models.UserSession = {
          id: getStreamSessionId(context.request),
          type: 'Stream',
          title: `${context.request.method} ${context.request.url}`,
          description: 'Pending Stream',
          details: context.request.headers || {},
        };
        utils.report(context, 'stream until manual cancellation');
        await new Promise(resolve => {
          userSessionStore.setUserSession(streamSession);
          streamSession.delete = () => resolve(true);
        });
      }
    });
    context.httpRegion.hooks.onResponse.addHook('keepStreaming', (_response, context) => {
      if (context.request) {
        userSessionStore.removeUserSession(getStreamSessionId(context.request));
      }
    });
    return true;
  }
  return false;
}

export function getStreamSessionId(request: models.Request) {
  return `${request.method}_${request.url}_${Object.values(request.headers || {}).join('_')}`;
}
