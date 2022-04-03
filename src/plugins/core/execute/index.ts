import * as models from '../../../models';
import { CreateRequestInterceptor } from './createRequestInterceptor';
import { RegionScopedVariablesInterceptor } from './regionScopedVariablesInterceptor';
import { VariableInterceptor } from './variableInterceptor';

export function initExecuteInterceptor(api: models.HttpyacHooksApi) {
  api.hooks.execute.addInterceptor(new RegionScopedVariablesInterceptor());
  api.hooks.execute.addInterceptor(new CreateRequestInterceptor());
  api.hooks.execute.addInterceptor(new VariableInterceptor());
}
