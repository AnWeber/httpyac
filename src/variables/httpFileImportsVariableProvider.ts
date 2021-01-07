import { HttpFile } from '../httpRegion';

export async function httpFileImportsVariableProvider(httpFile: HttpFile) {
  if (httpFile.imports) {
    const variables: Array<Record<string,any>> = [];
    for (const httpFileLoader of httpFile.imports) {
      const refHttpFile = await httpFileLoader();
      variables.push(refHttpFile.variables);
    }
    return Object.assign({},...variables);
  }
  return {};
}