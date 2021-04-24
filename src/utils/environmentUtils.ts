export const ENVIRONMENT_NONE = '__NONE__';

export function toEnvironmentKey(env: string[] | undefined): string {
  if (env) {
    return env.sort().join(',');
  }
  return ENVIRONMENT_NONE;
}
