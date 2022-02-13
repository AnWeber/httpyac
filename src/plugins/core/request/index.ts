import * as models from '../../../models';
import { attachDefaultHeaders } from './attachDefaultHeaders';
import { requestVariableReplacer } from './requestVariableReplacer';
import { setEnvRequestOptions } from './setEnvRequestOptions';
import { transformRequestBody } from './transformRequestBodyAction';

export function initOnRequestHook(api: models.HttpyacHooksApi) {
  api.hooks.onRequest.addHook('attachDefaultHeaders', attachDefaultHeaders);
  api.hooks.onRequest.addHook('setEnvRequestOptions', setEnvRequestOptions);
  api.hooks.onRequest.addHook('requestVariableReplacer', requestVariableReplacer);
  api.hooks.onRequest.addHook('transformRequestBody', transformRequestBody);
}
