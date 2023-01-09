import * as models from '../../../models';
import { attachDefaultHeaders } from './attachDefaultHeaders';
import { encodeRequestBody } from './encodeRequestBody';
import { isTrustedInterceptor } from './isTrustedInterceptor';
import { requestVariableReplacer } from './requestVariableReplacer';
import { setEnvRequestOptions } from './setEnvRequestOptions';
import { transformRequestBodyToBuffer } from './transformRequestBodyToBuffer';

export function initOnRequestHook(api: models.HttpyacHooksApi) {
  api.hooks.onRequest.addHook('attachDefaultHeaders', attachDefaultHeaders);
  api.hooks.onRequest.addHook('setEnvRequestOptions', setEnvRequestOptions);
  api.hooks.onRequest.addHook('transformRequestBody', transformRequestBodyToBuffer);
  api.hooks.onRequest.addHook('requestVariableReplacer', requestVariableReplacer);
  api.hooks.onRequest.addHook('encodeRequestBody', encodeRequestBody);

  api.hooks.onRequest.addInterceptor(isTrustedInterceptor);
}
