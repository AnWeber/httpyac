import { httpClientProvider } from '../../io';
import * as models from '../../models';
import { CookieJarInterceptor } from './cookieJarInterceptor';
import { digestAuthVariableReplacer } from './digestAuthVariableReplacer';
import { gotHttpClient } from './gotUtils';

httpClientProvider.exchange = gotHttpClient;

export function registerHttpPlugin(api: models.HttpyacHooksApi) {
  api.hooks.execute.addInterceptor(new CookieJarInterceptor());
  api.hooks.replaceVariable.addHook('digestAuth', digestAuthVariableReplacer);
}
