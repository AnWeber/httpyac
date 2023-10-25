import * as models from '../../../models';
import { CreateRequestInterceptor } from './createRequestInterceptor';
import { DisabledInterceptor } from './disabledInterceptor';
import { LazyVariableInterceptor } from './lazyVariableInterceptor';
import { LogResponseInterceptor } from './logResponseInterceptor';
import { RegionScopedVariablesInterceptor } from './regionScopedVariablesInterceptor';
import { RequestDurationEndInterceptor } from './requestDurationEndInterceptor';
import { RequestDurationStartInterceptor } from './requestDurationStartInterceptor';

export function initExecuteInterceptor(api: models.HttpyacHooksApi) {
  api.hooks.execute.addInterceptor(new DisabledInterceptor());
  api.hooks.execute.addInterceptor(new RegionScopedVariablesInterceptor());
  api.hooks.execute.addInterceptor(new RequestDurationStartInterceptor());
  api.hooks.execute.addInterceptor(new CreateRequestInterceptor());
  api.hooks.execute.addInterceptor(new LazyVariableInterceptor());
  api.hooks.execute.addInterceptor(new RequestDurationEndInterceptor());
  api.hooks.execute.addInterceptor(new LogResponseInterceptor());
}
