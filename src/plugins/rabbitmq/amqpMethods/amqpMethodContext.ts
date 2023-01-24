import { HttpResponse, ProcessorContext, StreamResponse } from '../../../models';
import { AmqpRequest } from '../amqpRequest';
import { AMQPChannel } from '@cloudamqp/amqp-client';

export interface AmqpMethodContext {
  body?: string | Buffer;
  channel: AMQPChannel;
  request: AmqpRequest;
  context: ProcessorContext;
  onMessage(type: string, message: HttpResponse & StreamResponse): void;
}

export interface AmqpError {
  isError: true;
  message: string;
  name?: string;
  stack?: unknown;
}
