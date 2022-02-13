import * as models from '../../../models';
import { registerCancelExecutionInterceptor } from './cancelExecutionInterceptor';
import { closeRequestBody } from './closeRequestBody';
import { closeResponseBody } from './closeResponseBody';

export function initParseEndHook(api: models.HttpyacHooksApi) {
  api.hooks.parseEndRegion.addHook('registerCancelExecutionInterceptor', registerCancelExecutionInterceptor);
  api.hooks.parseEndRegion.addHook('response', closeResponseBody);
  api.hooks.parseEndRegion.addHook('requestBody', closeRequestBody);
}
