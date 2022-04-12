import * as models from '../../../models';
import { CreateRequestInterceptor } from './createRequestInterceptor';
import { DisabledInterceptor } from './disabledInterceptor';
import { LazyVariableInterceptor } from './lazyVariableInterceptor';
import { LogResponseInterceptor } from './logResponseInterceptor';
import { RegionScopedVariablesInterceptor } from './regionScopedVariablesInterceptor';

export function initExecuteInterceptor(api: models.HttpyacHooksApi) {
  api.hooks.execute.addInterceptor(new DisabledInterceptor());
  api.hooks.execute.addInterceptor(new RegionScopedVariablesInterceptor());
  api.hooks.execute.addInterceptor(new CreateRequestInterceptor());
  api.hooks.execute.addInterceptor(new LazyVariableInterceptor());
  api.hooks.execute.addInterceptor(new LogResponseInterceptor());
}
