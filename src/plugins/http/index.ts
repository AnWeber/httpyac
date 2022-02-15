import { httpClientProvider } from '../../io';
import * as models from '../../models';
import { digestAuthVariableReplacer } from './digestAuthVariableReplacer';
import { gotHttpClient } from './gotUtils';

httpClientProvider.exchange = gotHttpClient;

export function registerHttpPlugin(api: models.HttpyacHooksApi) {
  api.hooks.replaceVariable.addHook('digestAuth', digestAuthVariableReplacer);
}
