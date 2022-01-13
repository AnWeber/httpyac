import * as models from '../../models';
import { userSessionStore } from '../../store';
import * as utils from '../../utils';
import { Variables as JetbrainsVariables } from './http-client';

interface IntellijGlobalCacheSession extends models.UserSession {
  variables: models.Variables;
}

export class IntellijVariables implements JetbrainsVariables {
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
      description: `Intellij Cache for ${envKey}`,
      details: {},
      type: 'intellij_global_cache',
      variables: {},
    };
    userSessionStore.setUserSession(intellijSession);
    return intellijSession;
  }

  private isIntellijGlobalCacheSession(value: models.UserSession | undefined): value is IntellijGlobalCacheSession {
    return !!value?.id && !!value.title;
  }

  set(varName: string, varValue: string): void {
    this.userSession.variables[varName] = varValue;
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
    return Object.entries(this.userSession.variables).length === 0;
  }
  clear(varName: string): void {
    delete this.userSession.variables[varName];
    utils.deleteVariableInContext(varName, this.context);
  }
  clearAll(): void {
    for (const [key] of Object.entries(this.userSession.variables)) {
      this.clear(key);
    }
  }
}
