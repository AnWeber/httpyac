import * as models from '../../models';
import { oauth2VariableReplacer } from './oauth2VariableReplacer';

export function registerOAuth2Plugin(api: models.HttpyacHooksApi) {
  api.hooks.replaceVariable.addHook('oauth2', oauth2VariableReplacer);
}
