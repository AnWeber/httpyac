import * as models from '../models';
import * as utils from '../utils';

export async function setEnvRejectUnauthorized(
  request: models.Request,
  { variables }: models.ProcessorContext
): Promise<void> {
  if (request && variables) {
    if (typeof variables.request_rejectUnauthorized !== 'undefined') {
      const rejectUnauthorized = toBoolean(variables.request_rejectUnauthorized);
      if (utils.isWebsocketRequest(request)) {
        request.options = Object.assign({}, request.options, { rejectUnauthorized });
      } else if (utils.isHttpRequest(request)) {
        request.https = Object.assign({}, request.https, { rejectUnauthorized });
      }
    }
  }
}

function toBoolean(value: unknown): boolean {
  if (utils.isString(value)) {
    return ['1', 'true', 'yes'].indexOf(value.toLowerCase()) >= 0;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return !!value;
}
