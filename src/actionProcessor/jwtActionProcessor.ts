import { ProcessorContext} from '../models';
import { isMimeTypeJSON, isString, decodeJWT } from '../utils';
import get from 'lodash/get';
import { log } from '../logger';

export async function jwtActionProcessor(data: string | boolean, {httpRegion}: ProcessorContext) {
  if (httpRegion.response && isMimeTypeJSON(httpRegion.response.contentType) && isString(httpRegion.response.body)) {
    const response = JSON.parse(httpRegion.response.body);
    if (isString(data)) {
      for (const key of data.split(',')) {
        const value = get(response, key);
        parseJwtToken(response, key, value);
      }
    } else if (!Array.isArray(response)) {
      for (const [key, value] of Object.entries(response)) {
        parseJwtToken(response, key, value);
      }
    }
    httpRegion.response.body = JSON.stringify(response, null, 2);
  }
  return true;
}


function parseJwtToken(response: any, key: string, value: any) {
  if (isString(value)) {
    try {
      const jwt = decodeJWT(value);
      if (jwt) {
        response[`${key}_parsed`] = jwt;
      }
    } catch (err) {
      log.error(err);
    }
  }
}

