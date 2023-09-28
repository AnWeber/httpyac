import { EnvironmentConfig } from './environmentConfig';
import { HttpFile } from './httpFile';
import { Variables } from './variables';

export interface VariableProviderContext {
  activeEnvironment?: string[];
  httpFile: HttpFile;
  config?: EnvironmentConfig;
  variables?: Variables;
}
