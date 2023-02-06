import * as utils from '../../../utils';
import { KafkaMethodContext } from './kafkaMethodContext';

export async function consume({ request, kafka, onMessage }: KafkaMethodContext) {
  const consumer = await kafka.consumer({
    groupId: utils.getHeaderString(request.headers, 'groupId') || 'httpyac',
    metadataMaxAge: utils.getHeaderNumber(request.headers, 'metadataMaxAge'),
    sessionTimeout: utils.getHeaderNumber(request.headers, 'sessionTimeout'),
    rebalanceTimeout: utils.getHeaderNumber(request.headers, 'rebalanceTimeout'),
    heartbeatInterval: utils.getHeaderNumber(request.headers, 'heartbeatInterval'),
    maxBytesPerPartition: utils.getHeaderNumber(request.headers, 'maxBytesPerPartition'),
    minBytes: utils.getHeaderNumber(request.headers, 'minBytes'),
    maxBytes: utils.getHeaderNumber(request.headers, 'maxBytes'),
    maxWaitTimeInMs: utils.getHeaderNumber(request.headers, 'maxWaitTimeInMs'),
    allowAutoTopicCreation: utils.getHeaderBoolean(request.headers, 'allowAutoTopicCreation'),
    maxInFlightRequests: utils.getHeaderNumber(request.headers, 'maxInFlightRequests'),
    readUncommitted: utils.getHeaderBoolean(request.headers, 'readUncommitted'),
    rackId: utils.getHeaderString(request.headers, 'rackId'),
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
