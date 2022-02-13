import * as models from '../../models';
import { setWebsocketEnvRejectUnauthorized } from './setWebsocketEnvRejectUnauthorized';
import { parseWebsocketLine } from './websocketHttpRegionParser';

export function registerWebsocketPlugin(api: models.HttpyacHooksApi) {
  api.hooks.onRequest.addHook('setWebsocketEnvRejectUnauthorized', setWebsocketEnvRejectUnauthorized);
  api.hooks.parse.addHook('websocket', parseWebsocketLine, { before: ['request'] });
}
