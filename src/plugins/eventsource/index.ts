import * as models from '../../models';
import { parseEventSource } from './eventSourceHttpRegionParser';

export function registerEventSourcePlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('eventSource', parseEventSource, { before: ['request'] });
}
