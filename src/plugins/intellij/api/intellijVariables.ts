import * as models from '../../../models';
import { userSessionStore } from '../../../store';
import * as utils from '../../../utils';
import { Variables } from './http-client';

type IntellijGlobalCacheSession = models.UserSession;

export class IntellijVariables implements Variables {
  private userSession: IntellijGlobalCacheSession;
  constructor(private readonly context: models.ProcessorContext) {
    this.userSession = this.getIntellijSession(context);
  }

  private getIntellijSession(context: models.ProcessorContext): IntellijGlobalCacheSession {
    const envKey = utils.toEnvironmentKey(context.httpFile.activeEnvironment);
    const id = `intellij_global_cache_${envKey}`;
    const userSession = userSessionStore.getUserSession(id);
    if (this.isIntellijGlobalCacheSession(userSession)) {
      return userSession;
    }
    const intellijSession: IntellijGlobalCacheSession = {
      id,
      title: `Intellij Cache for ${envKey}`,
      description: `Global Cache for all Intellij Variables`,
      details: {},
      type: 'intellij_global_cache',
    };
    userSessionStore.setUserSession(intellijSession);
    return intellijSession;
  }

  private isIntellijGlobalCacheSession(value: models.UserSession | undefined): value is IntellijGlobalCacheSession {
    return !!value?.id && !!value.title;
  }

  set(varName: string, varValue: string): void {
    this.userSession.details[varName] = varValue;
    utils.setVariableInContext(
      {
        [varName]: varValue,
      },
      this.context
    );
  }
  get(varName: string): unknown {
    return this.context.variables[varName];
  }
  isEmpty(): boolean {
    return Object.entries(this.userSession.details).length === 0;
  }
  clear(varName: string): void {
    delete this.userSession.details[varName];
    utils.deleteVariableInContext(varName, this.context);
  }
  clearAll(): void {
    for (const [key] of Object.entries(this.userSession.details)) {
      this.clear(key);
    }
  }
}
