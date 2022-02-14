import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { parseMQTTLine } from './mqttHttpRegionParser';
import * as mqtt from 'mqtt';

export function registerMqttPlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('mqtt', parseMQTTLine, { before: ['request'] });
  javascriptProvider.require.mqtt = mqtt;
}
