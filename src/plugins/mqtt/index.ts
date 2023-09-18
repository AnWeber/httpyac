import './completionItemProvider';

import * as mqtt from 'mqtt';

import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { parseMqttLine } from './mqttHttpRegionParser';
import { parseMQTTResponse } from './mqttResponseHttpRegionParser';

export function registerMqttPlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('mqtt', parseMqttLine, { before: ['request'] });
  api.hooks.parse.addHook('mqttResponse', parseMQTTResponse, { before: ['requestBody'] });
  javascriptProvider.require.mqtt = mqtt;
}
