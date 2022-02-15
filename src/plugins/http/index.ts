import { httpClientProvider } from '../../io';
import * as models from '../../models';
import { awsAuthVariableReplacer } from './awsAuthVariableReplacer';
import { basicAuthVariableReplacer } from './basicAuthVariableReplacer';
import { clientCertVariableReplacer } from './clientCertVariableReplacer';
import { CookieJarInterceptor } from './cookieJarInterceptor';
import { digestAuthVariableReplacer } from './digestAuthVariableReplacer';
import { gotHttpClient } from './gotUtils';

httpClientProvider.exchange = gotHttpClient;

export function registerHttpPlugin(api: models.HttpyacHooksApi) {
  api.hooks.execute.addInterceptor(new CookieJarInterceptor());
  api.hooks.replaceVariable.addHook('aws', awsAuthVariableReplacer);
  api.hooks.replaceVariable.addHook('basicAuth', basicAuthVariableReplacer);
  api.hooks.replaceVariable.addHook('clientCertificate', clientCertVariableReplacer);
  api.hooks.replaceVariable.addHook('digestAuth', digestAuthVariableReplacer);
}
