import { setAdditionalResponseBody } from '../utils';
import * as models from '../models';
import { transformRequestBody } from './transformRequestBodyAction';

export function initOnRequestHook(): models.OnRequestHook {
  const hook = new models.OnRequestHook();
  hook.addHook('transformRequestBody', transformRequestBody);
  return hook;
}

export function initOnResponseHook(): models.OnResponseHook {
  const hook = new models.OnResponseHook();
  hook.addHook('addAdditionalBody', setAdditionalResponseBody);
  return hook;
}
