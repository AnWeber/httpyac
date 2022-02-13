import * as models from '../../../models';
import { CookieJarInterceptor } from './cookieJarInterceptor';
import { CreateRequestInterceptor } from './createRequestInterceptor';

export function initOnResponseHook(api: models.HttpyacHooksApi) {
  api.hooks.execute.addInterceptor(new CreateRequestInterceptor());
  api.hooks.execute.addInterceptor(new CookieJarInterceptor());
}
