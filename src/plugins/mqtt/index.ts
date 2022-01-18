import * as models from '../../models';
import { parseMQTTLine } from './mqttHttpRegionParser';

export function registerMqttPlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('mqtt', parseMQTTLine, { before: ['request'] });
}
