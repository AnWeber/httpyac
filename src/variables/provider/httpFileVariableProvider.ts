import { VariableProvider, VariableProviderContext, Variables } from '../../models';
import { toEnvironmentKey } from '../../utils';

export class HttpFileVariableProvider implements VariableProvider {

  async getVariables(env: string[] | undefined, context: VariableProviderContext) : Promise<Variables> {
    const envkey = toEnvironmentKey(env);
    if (!context.httpFile.variablesPerEnv[envkey]) {
      context.httpFile.variablesPerEnv[envkey] = {};
    }
    return context.httpFile.variablesPerEnv[envkey];
  }
}
