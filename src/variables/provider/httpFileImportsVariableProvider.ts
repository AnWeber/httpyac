import { VariableProviderContext, Variables } from '../../models';
import { toEnvironmentKey } from '../../utils';


export async function provideHttpFileImportsVariables(env: string[] | undefined, context: VariableProviderContext): Promise<Variables> {
  const envkey = toEnvironmentKey(env);
  if (context.httpFile.imports) {
    const variables: Array<Variables> = [];
    for (const httpFileLoader of context.httpFile.imports) {
      const refHttpFile = await httpFileLoader(context.httpFile);
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
