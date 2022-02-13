import * as models from '../../models';
import { userSessionStore } from '../../store';
import { toEnvironmentKey } from '../../utils';

export async function provideIntellijGlobalVariables(env: string[] | undefined): Promise<models.Variables> {
  const envKey = toEnvironmentKey(env);
  const userSession: models.UserSession | undefined = userSessionStore.getUserSession(
    `intellij_global_cache_${envKey}`
  );
  return userSession?.details || {};
}
