import * as models from '../../../models';
import * as utils from '../../../utils';

export function handleJWTMetaData(response: models.HttpResponse, { httpRegion }: models.ProcessorContext) {
  if (httpRegion.metaData.jwt) {
    const body = response.parsedBody || response.body;
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
      response.parsedBody = Object.fromEntries(entries);
      response.prettyPrintBody = utils.stringifySafe(response.parsedBody, 2);
      response.body = response.prettyPrintBody;
    }
  }
}

function parseJwtToken(value: unknown): utils.JWTToken | null {
  if (utils.isString(value)) {
    return utils.decodeJWT(value);
  }
  return null;
}
