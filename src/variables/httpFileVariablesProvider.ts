import { HttpFile } from '../httpRegion';

export function httpFileVariablesProvider(httpFile: HttpFile) {
  return Promise.resolve(httpFile.variables);
}