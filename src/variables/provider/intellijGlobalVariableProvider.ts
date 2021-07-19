import { VariableProvider, Variables } from '../../models';
import { toEnvironmentKey } from '../../utils';

export const intellijVariableCache: Record<string, Variables> = {};


export class IntellijGlobalVariableProvider implements VariableProvider {
  async getVariables(env: string[] | undefined): Promise<Variables> {
    const envkey = toEnvironmentKey(env);
    if (!intellijVariableCache[envkey]) {
      intellijVariableCache[envkey] = {};
    }
    return intellijVariableCache[envkey];
  }
}
