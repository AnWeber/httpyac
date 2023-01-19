import * as models from '../../../models';
import * as utils from '../../../utils';

export function jwtMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext) {
  if (type === 'jwt') {
    context.httpRegion.hooks.onResponse.addHook('jwt', async response => {
      const body = response.parsedBody || response.body;
      if (body && typeof body === 'object') {
        const entries = Object.entries(body);

        let checkEntries = entries;
        if (value) {
          checkEntries = entries.filter(([key]) => value.indexOf(key) >= 0);
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
    });
    return true;
  }
  return false;
}

function parseJwtToken(value: unknown): utils.JWTToken | null {
  if (utils.isString(value)) {
    return utils.decodeJWT(value);
  }
  return null;
}
