import { setAdditionalResponseBody } from '../utils';
import * as models from '../models';
import { attachDefaultHeaders } from './envDefaultsHeaderAction';
import { requestVariableReplacer } from './requestVariableReplacer';
import { transformRequestBody } from './transformRequestBodyAction';
import { responseAsVariable } from './responseAsVariableAction';

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
