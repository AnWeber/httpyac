import * as utils from '../../../utils';
import { KafkaMethodContext } from './kafkaMethodContext';

export async function consume({ request, kafka, onMessage }: KafkaMethodContext) {
  const consumer = await kafka.consumer({
    groupId: 'httpyac',
  });
  await consumer.subscribe({
    topics: utils.getHeaderArray(request.headers, 'topic'),
  });

  await consumer.run({
    async eachMessage(payload) {
      onMessage(payload.topic, {
        protocol: 'KAFKA',
        name: `KAFKA consume ${payload.topic}`,
        statusCode: 0,
        headers: {
          topic: payload.topic,
          partition: payload.partition,
          method: 'consume',
          ...payload.message.headers,
        },
        message: payload.message.value ? utils.toString(payload.message.value) : utils.toString(payload.message.key),
        body: utils.toString(payload.message.value),
        rawBody: payload.message.value || undefined,
      });
    },
  });

  return undefined;
}
