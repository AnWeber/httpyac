import './completionItemProvider';

import * as eventSource from 'eventsource';

import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { parseEventSource } from './eventSourceHttpRegionParser';
import { parseEventSourceResponse } from './eventSourceResponseHttpRegionParser';

export function registerEventSourcePlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('eventSource', parseEventSource, { before: ['request'] });
  api.hooks.parse.addHook('eventSourceResponse', parseEventSourceResponse, { before: ['requestBody'] });
  javascriptProvider.require.eventsource = eventSource;
}
