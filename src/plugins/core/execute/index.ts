import * as models from '../../../models';
import { CreateRequestInterceptor } from './createRequestInterceptor';
import { LazyVariableInterceptor } from './lazyVariableInterceptor';
import { RegionScopedVariablesInterceptor } from './regionScopedVariablesInterceptor';

export function initExecuteInterceptor(api: models.HttpyacHooksApi) {
  api.hooks.execute.addInterceptor(new RegionScopedVariablesInterceptor());
  api.hooks.execute.addInterceptor(new CreateRequestInterceptor());
  api.hooks.execute.addInterceptor(new LazyVariableInterceptor());
}
