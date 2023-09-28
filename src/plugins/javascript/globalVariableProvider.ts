import type { HookInterceptor, HookTriggerContext } from 'hookpoint';

import * as models from '../../models';
import { userSessionStore } from '../../store';
import { toEnvironmentKey } from '../../utils';

export async function provideGlobalVariableStore(env: string[] | undefined): Promise<models.Variables> {
  const id = getGlobalUserSessionId(env);
  const userSession: models.UserSession | undefined = userSessionStore.getUserSession(id);
  return (
    userSession?.details || {
      $global: {},
    }
  );
}
export class GlobalVariablesInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  id = 'globalVariables';

  async afterLoop(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const [context] = hookContext.args;
    const global = context.variables.$global;
    if (global && typeof global === 'object' && Object.keys(global).length > 0) {
      const id = getGlobalUserSessionId(context.activeEnvironment);
      userSessionStore.setUserSession({
        id,
        title: 'global store',
        description: context.activeEnvironment
          ? `global Variables for ${context.activeEnvironment.join(', ')}`
          : 'global Variables',
        type: 'global_cache',
        details: {
          $global: global,
        },
      });
    }
    return true;
  }
}
function getGlobalUserSessionId(env: string[] | undefined) {
  const envKey = toEnvironmentKey(env);
  const id = `global_cache_${envKey}`;
  return id;
}
