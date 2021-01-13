import { HttpFile } from '../../httpRegion';

export function httpFileVariableProvider(httpFile: HttpFile) {
  return Promise.resolve(httpFile.variables);
}