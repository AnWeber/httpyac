import * as models from '../../models';
import './completionItemProvider';
import { initProvideEnvironmentsHook } from './environments';
import { initExecuteInterceptor } from './execute';
import { initParseMetData } from './metaData';
import { initParseHook } from './parse';
import { initParseEndHook } from './parseEnd';
import { initReplaceVariableHook } from './replacer';
import * as request from './request';
import { initOnResponseHook } from './response';

export function registerCorePlugins(api: models.HttpyacHooksApi) {
  initOnRequestHook(api);
  initOnResponseHook(api);
  initParseHook(api);
  initExecuteInterceptor(api);
  initParseMetData(api);
  initParseEndHook(api);

  initProvideEnvironmentsHook(api);
  initReplaceVariableHook(api);
}

function initOnRequestHook(api: models.HttpyacHooksApi) {
  api.hooks.onRequest.addHook('attachDefaultHeaders', request.attachDefaultHeaders);
  api.hooks.onRequest.addHook('setEnvRequestOptions', request.setEnvRequestOptions);
  api.hooks.onRequest.addHook('transformRequestBody', request.transformRequestBodyToBuffer);
  api.hooks.onRequest.addHook('requestVariableReplacer', request.requestVariableReplacer);
  api.hooks.onRequest.addHook('encodeRequestBody', request.encodeRequestBody);
  api.hooks.onRequest.addHook('addMulitpartformBoundary', request.addMulitpartformBoundary);

  api.hooks.onRequest.addInterceptor(request.isTrustedInterceptor);
  api.hooks.onRequest.addInterceptor(request.excludeProxyInterceptor);
}
