import { HttpFile } from '../../models';
import {toEnvironmentKey } from '../../utils';

export async function httpFileVariableProvider(env: string[] | undefined, httpFile: HttpFile) {
  const envkey = toEnvironmentKey(env);
  if (!httpFile.environments[envkey]) {
    httpFile.environments[envkey] = {};
  }
  return httpFile.environments[envkey];
}