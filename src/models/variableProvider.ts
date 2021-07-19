import { EnvironmentConfig } from './environmentConfig';
import { HttpFile } from './httpFile';
import { Variables } from './variables';

export interface VariableProviderContext{
  httpFile: HttpFile;
  config?: EnvironmentConfig,
}

export interface VariableProvider {
  reset?(): void;
  getEnvironments?(context: VariableProviderContext): Promise<string[]>;
  getVariables(env: string[] | undefined, context: VariableProviderContext): Promise<Variables>;
}
