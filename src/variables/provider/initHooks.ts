import { ProvideVariablesHook, ProvideEnvironmentsHook } from '../../models';
import { provideConfigVariables, provideConfigEnvironments } from './configVariableProvider';
import { provideDotenvVariables, provideDotenvEnvironments } from './dotenvVariableProvider';
import { provideIntellijGlobalVariables } from './intellijGlobalVariableProvider';
import { provideIntellijVariables, provideIntellijEnvironments } from './intellijVariableProvider';

export enum VariableProviderType {
  config = 'config',
  dotenv = 'dotenv',
  httpFileImports = 'httpFileImports',
  httpFile = 'httpFile',
  intellij = 'intellij',
  intellijGlobal = 'intellijGlobal',
}

export function initProvideVariablesHook(): ProvideVariablesHook {
  const hook = new ProvideVariablesHook();

  hook.addHook(VariableProviderType.config, provideConfigVariables);
  hook.addHook(VariableProviderType.dotenv, provideDotenvVariables);
  hook.addHook(VariableProviderType.intellij, provideIntellijVariables);
  hook.addHook(VariableProviderType.intellijGlobal, provideIntellijGlobalVariables);

  return hook;
}

export function initProvideEnvironmentsHook(): ProvideEnvironmentsHook {
  const hook = new ProvideEnvironmentsHook();

  hook.addHook(VariableProviderType.config, provideConfigEnvironments);
  hook.addHook(VariableProviderType.dotenv, provideDotenvEnvironments);
  hook.addHook(VariableProviderType.intellij, provideIntellijEnvironments);

  return hook;
}
