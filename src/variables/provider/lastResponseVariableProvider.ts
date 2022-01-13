import * as models from '../../models';
import { userSessionStore } from '../../store';

export const intellijVariableCache: Record<string, models.Variables> = {};

export async function provideLastResponseVariables(): Promise<models.Variables> {
  const userSession: (models.UserSession & { response?: models.HttpResponse }) | undefined =
    userSessionStore.getUserSession('last_response');
  if (userSession?.response) {
    return {
      response: userSession.response,
    };
  }
  return {};
}
