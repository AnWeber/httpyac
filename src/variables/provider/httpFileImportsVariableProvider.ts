import { HttpFile, VariableProvider, Variables } from '../../models';
import { toEnvironmentKey } from '../../utils';

export class HttpFileImportsVariableProvider implements VariableProvider {

  async getVariables(env: string[] | undefined, httpFile: HttpFile): Promise<Variables> {

    const envkey = toEnvironmentKey(env);

    if (httpFile.imports) {
      const variables: Array<Variables> = [];
      for (const httpFileLoader of httpFile.imports) {
        const refHttpFile = await httpFileLoader(httpFile);
        if (refHttpFile) {
          if (!refHttpFile.variablesPerEnv[envkey]) {
            refHttpFile.variablesPerEnv[envkey] = {};
          }
          variables.push(refHttpFile.variablesPerEnv[envkey]);
        }
      }
      return Object.assign({}, ...variables);
    }
    return {};
  }
}
