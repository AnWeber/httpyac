import * as models from '../../../models';
import * as utils from '../../../utils';

export async function setEnvRequestOptions(
  request: models.Request,
  { variables }: models.ProcessorContext
): Promise<void> {
  await setEnvRejectUnauthorized(request, variables);
  await setEnvProxy(request, variables);
}

async function setEnvRejectUnauthorized(request: models.Request, variables: models.Variables): Promise<void> {
  if (request && variables) {
    if (typeof variables.request_rejectUnauthorized !== 'undefined') {
      request.noRejectUnauthorized = !utils.toBoolean(variables.request_rejectUnauthorized);
    }
  }
}

async function setEnvProxy(request: models.Request, variables: models.Variables): Promise<void> {
  if (utils.isString(variables?.request_proxy)) {
    request.proxy = variables.request_proxy;
  }
}
