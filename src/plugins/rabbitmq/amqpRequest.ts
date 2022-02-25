import { Request } from '../../models';
import type { AMQPProperties } from '@cloudamqp/amqp-client';

export interface AmqpRequest extends Request<'AMQP'> {
  headers?: Record<string, string | string[] | undefined> | undefined;
  body?: string | Buffer;
  options?: AMQPProperties;
}

export function isAmqpRequest(request: Request | undefined): request is AmqpRequest {
  return request?.method === 'AMQP';
}
