import { HttpFile } from '../httpRegion';

export function httpFileImportsVariableProvider(httpFile: HttpFile) {
  if (httpFile.imports) {
    return Object.assign({},...httpFile.imports.map(obj => obj.variables));
  }
  return {};
}