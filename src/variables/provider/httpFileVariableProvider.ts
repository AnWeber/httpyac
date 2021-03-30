import { HttpFile, VariableProvider } from '../../models';
import {toEnvironmentKey } from '../../utils';

export class HttpFileVariableProvider implements VariableProvider {

  async getVariables(env: string[] | undefined, httpFile: HttpFile) {
    const envkey = toEnvironmentKey(env);
    if (!httpFile.variablesPerEnv[envkey]) {
      httpFile.variablesPerEnv[envkey] = {};
    }
    return httpFile.variablesPerEnv[envkey];
  }
}