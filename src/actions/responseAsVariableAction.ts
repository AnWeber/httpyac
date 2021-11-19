import { log, userInteractionProvider } from '../io';
import * as models from '../models';
import * as utils from '../utils';

export async function responseAsVariable(
  response: models.HttpResponse,
  context: models.ProcessorContext
): Promise<models.HttpResponse> {
  const body = response.parsedBody || response.body;
  context.variables.response = response;
  if (context.httpRegion.metaData.name || context.httpRegion.metaData.jwt) {
    handleJWTMetaData(body, context);
    handleNameMetaData(body, context);
  }
  return response;
}

function handleNameMetaData(body: unknown, context: models.ProcessorContext) {
  const { httpRegion } = context;
  if (httpRegion.metaData.name) {
    const name = httpRegion.metaData.name
      .trim()
      .replace(/\s/u, '_')
      .replace(/-./gu, value => value[1].toUpperCase());
    if (utils.isValidVariableName(name)) {
      utils.setVariableInContext({ [name]: body }, context);
    } else {
      const message = `Javascript Keyword ${name} not allowed as name`;
      userInteractionProvider.showWarnMessage?.(message);
      log.warn(message);
    }
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
    try {
      return utils.decodeJWT(value);
    } catch (err) {
      log.error(err);
    }
  }
  return null;
}
