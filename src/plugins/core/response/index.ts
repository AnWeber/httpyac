import * as models from '../../../models';
import { setAdditionalResponseBody } from '../../../utils';
import { responseAsVariable } from './responseAsVariableAction';

export function initOnResponseHook(api: models.HttpyacHooksApi) {
  api.hooks.onResponse.addHook('addAdditionalBody', setAdditionalResponseBody);
  api.hooks.onResponse.addHook('responseAsVariable', responseAsVariable);
}
