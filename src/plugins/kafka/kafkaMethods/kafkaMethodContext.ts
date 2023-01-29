import { HttpResponse, ProcessorContext, StreamResponse } from '../../../models';
import { KafkaRequest } from '../kafkaRequest';
import { Kafka } from 'kafkajs';

export interface KafkaMethodContext {
  kafka: Kafka;
  request: KafkaRequest;
  context: ProcessorContext;
  onMessage(type: string, message: HttpResponse & StreamResponse): void;
}

export interface KafkaError {
  isError: true;
  message: string;
  name?: string;
  stack?: unknown;
}
