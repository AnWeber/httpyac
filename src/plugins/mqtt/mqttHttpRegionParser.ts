import * as utils from '../../utils';
import { MQTTRequestClient } from './mqttRequestClient';
import { userSessionStore } from '../../store';

export const parseMqttLine = utils.parseRequestLineFactory({
  protocol: 'MQTT',
  methodRegex: /^\s*(MQTT(S)?)\s+(?<url>.+?)\s*$/u,
  protocolRegex: /^\s*(?<url>mqtt(s)?:\/\/.+?)\s*$/iu,
  requestClientFactory(request, context) {
    return new MQTTRequestClient(request, context);
  },
  modifyRequest(request) {
    request.supportsStreaming = true;
  },
  sessionStore: userSessionStore,
});
