import * as models from '../../../models';
import { provideConfigEnvironments, provideConfigVariables } from './configVariableProvider';
import { provideDotenvEnvironments, provideDotenvVariables } from './dotenvVariableProvider';
import { provideLastResponseVariables } from './lastResponseVariableProvider';

export function initProvideEnvironmentsHook(api: models.HttpyacHooksApi) {
  api.hooks.provideEnvironments.addHook('config', provideConfigEnvironments);
  api.hooks.provideEnvironments.addHook('dotenv', provideDotenvEnvironments);
  api.hooks.provideVariables.addHook('config', provideConfigVariables);
  api.hooks.provideVariables.addHook('dotenv', provideDotenvVariables);
  api.hooks.provideVariables.addHook('response', provideLastResponseVariables);
}
