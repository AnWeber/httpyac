import * as models from '../models';
import * as utils from '../utils';

export async function setEnvRequestOptions(
  request: models.Request,
  { variables, httpRegion }: models.ProcessorContext
): Promise<void> {
  await setEnvRejectUnauthorized(request, variables);
  await setEnvProxy(httpRegion, variables);
}

async function setEnvRejectUnauthorized(request: models.Request, variables: models.Variables): Promise<void> {
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

async function setEnvProxy(httpRegion: models.HttpRegion, variables: models.Variables): Promise<void> {
  if (httpRegion && utils.isString(variables?.request_proxy)) {
    httpRegion.metaData.proxy = variables.request_proxy;
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
