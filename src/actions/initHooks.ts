import * as models from '../models';
import { setAdditionalResponseBody } from '../utils';
import { attachDefaultHeaders } from './envDefaultsHeaderAction';
import { requestVariableReplacer } from './requestVariableReplacer';
import { responseAsVariable } from './responseAsVariableAction';
import { transformRequestBody } from './transformRequestBodyAction';

export function initOnRequestHook(): models.OnRequestHook {
  const hook = new models.OnRequestHook();
  hook.addHook('attachDefaultHeaders', attachDefaultHeaders);
  hook.addHook('requestVariableReplacer', requestVariableReplacer);
  hook.addHook('transformRequestBody', transformRequestBody);
  return hook;
}

export function initOnResponseHook(): models.OnResponseHook {
  const hook = new models.OnResponseHook();
  hook.addHook('addAdditionalBody', setAdditionalResponseBody);
  hook.addHook('responseAsVariable', responseAsVariable);
  return hook;
}
