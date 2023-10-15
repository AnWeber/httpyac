import * as models from '../../../models';
import * as utils from '../../../utils';
import { AmqpRequest } from '../amqpRequest';
import { AmqpError } from './amqpMethodContext';

export function getNonAmqpHeaders(headers: Record<string, string | Array<string> | undefined> | undefined) {
  if (headers) {
    return Object.fromEntries(Object.entries(headers).filter(([key]) => !key.startsWith('amqp_')));
  }
  return undefined;
}

export function isAmqpError(obj: unknown): obj is AmqpError {
  const guard = obj as AmqpError;
  return guard?.isError;
}

export function errorToHttpResponse(err: unknown, request: AmqpRequest): models.HttpResponse & models.StreamResponse {
  if (utils.isError(err)) {
    return {
      protocol: 'AMQP',
      statusCode: 1,
      message: err.message,
      request,
      body: utils.stringifySafe({
        name: err.name,
        message: err.message,
        stack: err.stack,
      }),
    };
  }
  return {
    protocol: 'AMQP',
    statusCode: 1,
    message: utils.toString(err),
    body: utils.toString(err),
  };
}
