import * as utils from '../../utils';
import { MQTTRequestClient } from './mqttRequestClient';

export const parseMqttLine = utils.parseRequestLineFactory({
  protocol: 'MQTT',
  methodRegex: /^\s*(mqtt(s)?)\s+(?<url>.+?)\s*$/iu,
  protocolRegex: /^\s*(?<url>mqtt(s)?:\/\/.+?)\s*$/iu,
  requestClientFactory(request, context) {
    return new MQTTRequestClient(request, context);
  },
  modifyRequest(request) {
    request.supportsStreaming = true;
  },
});
