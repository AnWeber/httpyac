import { AMQPChannel } from '@cloudamqp/amqp-client';

import { HttpResponse, ProcessorContext, StreamResponse } from '../../../models';
import { AmqpRequest } from '../amqpRequest';

export interface AmqpMethodContext {
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
