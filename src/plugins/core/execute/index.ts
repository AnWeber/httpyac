import * as models from '../../../models';
import { CreateRequestInterceptor } from './createRequestInterceptor';

export function initExecuteInterceptor(api: models.HttpyacHooksApi) {
  api.hooks.execute.addInterceptor(new CreateRequestInterceptor());
}
