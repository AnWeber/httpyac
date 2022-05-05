import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { parseEventSource } from './eventSourceHttpRegionParser';
import { parseEventSourceResponse } from './eventSourceResponseHttpRegionParser';
import * as eventSource from 'eventsource';

export function registerEventSourcePlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('eventSource', parseEventSource, { before: ['request'] });
  api.hooks.parse.addHook('eventSourceResponse', parseEventSourceResponse, { before: ['eventSource'] });
  javascriptProvider.require.eventsource = eventSource;
}
