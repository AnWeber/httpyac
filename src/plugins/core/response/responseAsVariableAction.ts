import * as models from '../../../models';
import { userSessionStore } from '../../../store';
import * as utils from '../../../utils';

export async function responseAsVariable(
  response: models.HttpResponse,
  context: models.ProcessorContext
): Promise<void> {
  const body = response.parsedBody || response.body;
  if (context.httpRegion.metaData.name || context.httpRegion.metaData.jwt) {
    handleJWTMetaData(body, context);
    handleNameMetaData(response, body, context);
  }
  setLastResponseInVariables(context, response);
}

function setLastResponseInVariables(context: models.ProcessorContext, response: models.HttpResponse) {
  const cloneResponse = utils.shrinkCloneResponse(response);
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

function handleNameMetaData(response: models.HttpResponse, body: unknown, context: models.ProcessorContext) {
  const { httpRegion } = context;
  if (httpRegion.metaData.name) {
    const name = httpRegion.metaData.name
      .trim()
      .replace(/\s/gu, '-')
      .replace(/-./gu, value => value[1].toUpperCase());
    utils.setVariableInContext({ [name]: body, [`${name}Response`]: response }, context);
  }
}

function handleJWTMetaData(body: unknown, { httpRegion }: models.ProcessorContext) {
  if (httpRegion.metaData.jwt && httpRegion.response) {
    if (body && typeof body === 'object') {
      const entries = Object.entries(body);

      let checkEntries = entries;
      if (utils.isString(httpRegion.metaData.jwt)) {
        const jwt = httpRegion.metaData.jwt;
        checkEntries = entries.filter(([key]) => jwt.indexOf(key) >= 0);
      }
      for (const [key, value] of checkEntries) {
        const val = parseJwtToken(value);
        if (val) {
          entries.push([`${key}_parsed`, val]);
        }
      }
      httpRegion.response.parsedBody = Object.fromEntries(entries);
      httpRegion.response.prettyPrintBody = JSON.stringify(httpRegion.response.parsedBody, null, 2);
      httpRegion.response.body = httpRegion.response.prettyPrintBody;
    }
  }
}

function parseJwtToken(value: unknown): utils.JWTToken | null {
  if (utils.isString(value)) {
    return utils.decodeJWT(value);
  }
  return null;
}
