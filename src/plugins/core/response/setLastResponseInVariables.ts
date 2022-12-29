import * as models from '../../../models';
import { userSessionStore } from '../../../store';
import { shrinkCloneResponse } from '../../../utils';

export function setLastResponseInVariables(response: models.HttpResponse, context: models.ProcessorContext) {
  const cloneResponse = shrinkCloneResponse(response);
  userSessionStore.setUserSession({
    id: 'last_response',
    title: 'last response',
    description: `response of ${context.httpRegion.symbol.name}`,
    details: {},
    type: 'LAST_RESPONSE',
    response: cloneResponse,
  });
  context.variables.response = response;
}
