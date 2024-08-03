import * as models from '../../models';
import * as utils from '../../utils';
import { isGrpcRequest } from './grpcRequest';

export async function callOptionsRequestHook(request: models.Request, context: models.ProcessorContext): Promise<void> {
  if (isGrpcRequest(request) && request.headers) {
    utils.report(context, 'create call options');
    const timeout = request.timeout || utils.toNumber(context.config?.request?.timeout);
    if (timeout !== undefined) {
      request.callOptions = Object.assign({}, request.options, {
        deadline: new Date(new Date().getTime() + timeout),
      });
    }
  }
  return undefined;
}
