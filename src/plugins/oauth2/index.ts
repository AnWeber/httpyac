import * as models from '../../models';
import { getOAuth2Response, oauth2VariableReplacer } from './oauth2VariableReplacer';

export function registerOAuth2Plugin(api: models.HttpyacHooksApi) {
  api.hooks.replaceVariable.addHook('oauth2', oauth2VariableReplacer);
  api.hooks.provideVariables.addHook('oauth2', () => ({
    $getOAuth2Response: getOAuth2Response,
  }));
}
