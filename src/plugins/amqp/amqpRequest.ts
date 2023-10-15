import type { AMQPProperties } from '@cloudamqp/amqp-client';

import { Request } from '../../models';

export interface AmqpRequest extends Request<string> {
  headers?: Record<string, string | string[] | undefined> | undefined;
  body?: string | Buffer;
  options?: AMQPProperties;
}

export function isAmqpRequest(request: Request | undefined): request is AmqpRequest {
  return request?.protocol === 'AMQP';
}
