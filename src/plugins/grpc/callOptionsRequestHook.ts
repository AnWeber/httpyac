import { HookCancel } from 'hookpoint';

import * as models from '../../models';
import * as utils from '../../utils';
import { isGrpcRequest } from './grpcRequest';

export async function callOptionsRequestHook(
  request: models.Request,
  context: models.ProcessorContext
): Promise<void | typeof HookCancel> {
  if (isGrpcRequest(request) && request.headers) {
    utils.report(context, 'create call options');
    if (context.config?.request?.timeout) {
      const timeout = utils.toNumber(context.config?.request?.timeout) || 0;
      request.callOptions = Object.assign({}, request.options, {
        deadline: new Date(new Date().getTime() + timeout),
      });
    }
  }
  return undefined;
}
