import { HttpFile, VariableProvider, Variables } from '../../models';
import {toEnvironmentKey } from '../../utils';

export class HttpFileImportsVariableProvider implements VariableProvider {

  async getVariables(env: string[] | undefined, httpFile: HttpFile) {

    const envkey = toEnvironmentKey(env);

    if (httpFile.imports) {
      const variables: Array<Variables> = [];
      for (const httpFileLoader of httpFile.imports) {
        const refHttpFile = await httpFileLoader();
        if (!refHttpFile.environments[envkey]) {
          refHttpFile.environments[envkey] = {};
        }
        variables.push(refHttpFile.environments[envkey]);
      }
      return Object.assign({}, ...variables);
    }
    return {};
  }
}