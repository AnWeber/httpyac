import * as models from '../../models';
import { userSessionStore } from '../../store';

export async function provideIntellijGlobalVariables(): Promise<models.Variables> {
  const userSession: models.UserSession | undefined = userSessionStore.getUserSession(`intellij_global_cache`);
  return userSession?.details || {};
}
