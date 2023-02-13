import { completionItemProvider } from '../../io';
import { isMQTTRequest } from './mqttRequest';

completionItemProvider.emptyLineProvider.push(() => [
  {
    name: 'MQTT',
    description: 'MQTT request',
  },
]);

completionItemProvider.requestHeaderProvider.push(request => {
  if (isMQTTRequest(request)) {
    return [
      {
        name: 'username',
        description: 'the username required by your broker',
      },
      {
        name: 'password',
        description: 'the password required by your broker',
      },
      {
        name: 'clean',
        description: 'true, set to false to receive QoS 1 and 2 messages while offline',
      },
      {
        name: 'keepalive',
        description: '10 seconds, set to 0 to disable',
      },
      {
        name: 'QoS',
        description: 'the QoS used for subscribe or publish',
      },
      { name: 'retain', description: 'the retain flat used for publish' },
      { name: 'subscribe', description: 'topics to subscribe to' },
      { name: 'publish', description: 'topics to publish to' },
      { name: 'topic', description: 'topic to subscribe and publish to' },
    ];
  }
  return [];
});
