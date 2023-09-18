import './completionItemProvider';

import * as ws from 'ws';

import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { setWebsocketEnvRejectUnauthorized } from './setWebsocketEnvRejectUnauthorized';
import { parseWebsocketLine } from './websocketHttpRegionParser';
import { parseWebSocketResponse } from './websocketResponseHttpRegionParser';

export function registerWebsocketPlugin(api: models.HttpyacHooksApi) {
  api.hooks.onRequest.addHook('setWebsocketEnvRejectUnauthorized', setWebsocketEnvRejectUnauthorized);
  api.hooks.parse.addHook('websocket', parseWebsocketLine, { before: ['request'] });
  api.hooks.parse.addHook('websocketResponse', parseWebSocketResponse, { before: ['requestBody'] });
  javascriptProvider.require.ws = ws;
}
