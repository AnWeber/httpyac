import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { parseMQTTLine } from './mqttHttpRegionParser';
import { parseMQTTResponse } from './mqttResponseHttpRegionParser';
import * as mqtt from 'mqtt';

export function registerMqttPlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('mqtt', parseMQTTLine, { before: ['request'] });
  api.hooks.parse.addHook('mqttResponse', parseMQTTResponse, { before: ['requestBody'] });
  javascriptProvider.require.mqtt = mqtt;
}
