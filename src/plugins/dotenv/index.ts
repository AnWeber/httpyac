import * as models from '../../models';
import { provideDotenvEnvironments, provideDotenvVariables } from './dotenvVariableProvider';

export function registerDotenvPlugin(api: models.HttpyacHooksApi) {
  api.hooks.provideEnvironments.addHook('dotenv', provideDotenvEnvironments);
  api.hooks.provideVariables.addHook('dotenv', provideDotenvVariables);
}
