import * as models from '../../models';
import * as utils from '../../utils';
import { isWebsocketRequest } from './websocketRequest';

export async function setWebsocketEnvRejectUnauthorized(
  request: models.Request,
  { variables }: models.ProcessorContext
): Promise<void> {
  if (isWebsocketRequest(request) && variables) {
    if (typeof variables.request_rejectUnauthorized !== 'undefined') {
      const rejectUnauthorized = toBoolean(variables.request_rejectUnauthorized);
      request.options = Object.assign({}, request.options, { rejectUnauthorized });
    }
  }
}

function toBoolean(value: unknown): boolean {
  if (utils.isString(value)) {
    return ['0', 'false', 'no'].indexOf(value.toLowerCase()) < 0;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return !!value;
}
