import { VariableProvider, VariableProviderContext, Variables } from '../../models';
import { expandVariables } from '../../utils';

export class ConfigVariableProvider implements VariableProvider {

  private DEFAULT_ENV = '$shared';
  async getVariables(envs: string[] | undefined, context: VariableProviderContext) : Promise<Variables> {

    const variables: Variables[] = [];

    if (envs && context.config?.environments) {
      const environments = context.config.environments;

      variables.push(environments[this.DEFAULT_ENV]);
      variables.push(...envs.map(env => environments[env]));
    }
    return expandVariables(Object.assign({}, ...variables));
  }
}
