import * as models from '../../../models';
import { handleNameMetaData } from './handleNameMetaData';
import { setLastResponseInVariables } from './setLastResponseInVariables';

export function initOnResponseHook(api: models.HttpyacHooksApi) {
  api.hooks.onResponse.addHook('handleMetaDataName', handleNameMetaData);
  api.hooks.onResponse.addHook('setLastResponseInVariables', setLastResponseInVariables);
}
