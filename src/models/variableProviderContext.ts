import { EnvironmentConfig } from './environmentConfig';
import { HttpFile } from './httpFile';

export interface VariableProviderContext{
  httpFile: HttpFile;
  config?: EnvironmentConfig,
}
