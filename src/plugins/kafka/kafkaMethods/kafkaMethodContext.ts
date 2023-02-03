import * as models from '../../../models';
import * as utils from '../../../utils';
import { KafkaRequest } from '../kafkaRequest';
import { Kafka } from 'kafkajs';

export interface KafkaMethodContext {
  kafka: Kafka;
  request: KafkaRequest;
  context: models.ProcessorContext;
  onMessage(type: string, message: models.HttpResponse & models.StreamResponse): void;
}

export interface KafkaError {
  isError: true;
  message: string;
  name?: string;
  stack?: unknown;
}

export function errorToHttpResponse(err: unknown): models.HttpResponse & models.StreamResponse {
  if (utils.isError(err)) {
    return {
      protocol: 'KAFKA',
      statusCode: 1,
      message: err.message,
      body: utils.stringifySafe({
        name: err.name,
        message: err.message,
        stack: err.stack,
      }),
    };
  }
  return {
    protocol: 'KAFKA',
    statusCode: 1,
    message: utils.toString(err),
    body: utils.toString(err),
  };
}
