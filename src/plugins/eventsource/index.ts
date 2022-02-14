import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { parseEventSource } from './eventSourceHttpRegionParser';
import * as eventSource from 'eventsource';

export function registerEventSourcePlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('eventSource', parseEventSource, { before: ['request'] });
  javascriptProvider.require.eventsource = eventSource;
}
