import { EnvironmentConfig } from './environmentConfig';
import { HttpFile } from './httpFile';
import { Variables } from './variables';

export interface VariableProviderContext {
  httpFile: HttpFile;
  config?: EnvironmentConfig;
  variables?: Variables;
}
