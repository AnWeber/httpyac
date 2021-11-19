import { VariableProviderContext, Variables } from '../../models';
import { expandVariables } from '../../utils';

const DEFAULT_ENV = '$shared';

export async function provideConfigEnvironments(context: VariableProviderContext): Promise<string[]> {
  if (context.config?.environments) {
    return Object.keys(context.config.environments).filter(obj => obj !== DEFAULT_ENV);
  }
  return [];
}

export async function provideConfigVariables(
  envs: string[] | undefined,
  context: VariableProviderContext
): Promise<Variables> {
  const variables: Variables[] = [];

  if (context.config?.environments) {
    const environments = context.config.environments;

    variables.push(environments[DEFAULT_ENV]);
    if (envs) {
      variables.push(...envs.map(env => environments[env]));
    }
  }
  return expandVariables(Object.assign({}, ...variables));
}
