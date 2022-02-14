import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { setWebsocketEnvRejectUnauthorized } from './setWebsocketEnvRejectUnauthorized';
import { parseWebsocketLine } from './websocketHttpRegionParser';
import * as ws from 'ws';

export function registerWebsocketPlugin(api: models.HttpyacHooksApi) {
  api.hooks.onRequest.addHook('setWebsocketEnvRejectUnauthorized', setWebsocketEnvRejectUnauthorized);
  api.hooks.parse.addHook('websocket', parseWebsocketLine, { before: ['request'] });
  javascriptProvider.require.ws = ws;
}
