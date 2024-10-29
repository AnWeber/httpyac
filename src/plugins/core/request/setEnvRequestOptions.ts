import * as models from '../../../models';
import * as utils from '../../../utils';

export async function setEnvRequestOptions(
  request: models.Request,
  { variables }: models.ProcessorContext
): Promise<void> {
  setRequestRejectUnauthorized(request, variables);
  setRequestNoRedirect(request, variables);
  setRequestProxy(request, variables);
  setRequestTimeout(request, variables);
  setEnvironmentProxy(request);
}

function setRequestRejectUnauthorized(request: models.Request, variables: models.Variables): void {
  if (request && variables) {
    if (typeof variables.request_rejectUnauthorized !== 'undefined') {
      request.noRejectUnauthorized = !utils.toBoolean(variables.request_rejectUnauthorized);
    }
  }
}

function setRequestNoRedirect(request: models.Request, variables: models.Variables): void {
  if (request && variables) {
    if (typeof variables.request_noRedirect !== 'undefined') {
      request.noRedirect = utils.toBoolean(variables.request_noRedirect);
    }
  }
}

function setRequestProxy(request: models.Request, variables: models.Variables): void {
  if (utils.isString(variables?.request_proxy)) {
    request.proxy = variables.request_proxy;
  }
}

function setEnvironmentProxy(request: models.Request) {
  if (request.proxy || !utils.isHttpRequest(request)) {
    return;
  }
  const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY;
  if (request.url.toLowerCase().startsWith('https') && utils.isString(httpsProxy)) {
    request.proxy = httpsProxy;
  } else if (utils.isString(httpProxy)) {
    request.proxy = process.env.httpProxy;
  }
}

function setRequestTimeout(request: models.Request, variables: models.Variables): void {
  const timeout = utils.toNumber(variables?.request_timeout);
  if (timeout !== undefined) {
    request.timeout = timeout;
  }
}
