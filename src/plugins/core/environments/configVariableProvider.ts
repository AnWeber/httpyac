import { log } from '../../../io';
import { VariableProviderContext, Variables } from '../../../models';

const DEFAULT_ENV = '$default';
const SHARED_ENV = '$shared';

export async function provideConfigEnvironments(context: VariableProviderContext): Promise<string[]> {
  if (context.config?.environments) {
    const envs = Object.keys(context.config.environments).filter(obj => [DEFAULT_ENV, SHARED_ENV].indexOf(obj) < 0);

    log.info('Config Env Provider found environments', envs);
    return envs;
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

    variables.push(environments[SHARED_ENV]);
    if (envs && envs.length > 0) {
      variables.push(...envs.map(env => environments[env]));
    } else {
      variables.push(environments[DEFAULT_ENV]);
    }
  }
  return Object.assign({}, ...variables);
}
