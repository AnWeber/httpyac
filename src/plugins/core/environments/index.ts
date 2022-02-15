import * as models from '../../../models';
import { provideConfigEnvironments, provideConfigVariables } from './configVariableProvider';
import { provideLastResponseVariables } from './lastResponseVariableProvider';

export function initProvideEnvironmentsHook(api: models.HttpyacHooksApi) {
  api.hooks.provideEnvironments.addHook('config', provideConfigEnvironments);
  api.hooks.provideVariables.addHook('config', provideConfigVariables);
  api.hooks.provideVariables.addHook('response', provideLastResponseVariables);
}
