import { ProcessorContext} from '../models';
import { isMimeTypeJSON, isString } from '../utils';
import get from 'lodash/get';

export async function jwtActionProcessor(jwtTokens: string[], {httpRegion}: ProcessorContext) {
  if (httpRegion.response && isMimeTypeJSON(httpRegion.response.contentType) && isString(httpRegion.response.body)) {
    const response = JSON.parse(httpRegion.response.body);
    for (const jwt of jwtTokens) {
      response[`${jwt}_parsed`] = decodeToken(get(response, jwt));
    }
    httpRegion.response.body = JSON.stringify(response, null, 2);
  }
  return true;
}


function decodeToken(str: string) {
  let payload = str.split('.')[1];

  payload = payload.replace(/-/g, '+');
  payload = payload.replace(/_/g, '/');
  switch (payload.length % 4) {
    case 0:
      break;
    case 2:
      payload += '==';
      break;
    case 3:
      payload += '=';
      break;
    default:
      return null;
  }

  const result = decodeURIComponent(escape(Buffer.from(payload, 'base64').toString()));

  return JSON.parse(result);
}