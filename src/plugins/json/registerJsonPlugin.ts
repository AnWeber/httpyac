import * as models from '../../models';
import { jsonResponseInterceptor } from './jsonResponseInterceptor';

export function registerJsonPlugin(api: models.HttpyacHooksApi) {
  api.hooks.onResponse.addInterceptor(jsonResponseInterceptor);
}
