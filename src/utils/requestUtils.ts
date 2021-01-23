import { HttpMethod, HttpRequest, HttpResponse, HttpTimings } from '../models';
import { isString } from './stringUtils';
import { EOL } from 'os';

export function isRequestMethod(method: string | undefined): method is HttpMethod {
  if (method) {
    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'].includes(method.toUpperCase());
  }
  return false;
}

export function getHeader(headers: Record<string, string | string[] | undefined | null>, headerName: string) {
  if (headers) {
    const value = Object.entries(headers)
      .find(obj => obj[0].toLowerCase() === headerName.toLowerCase());
    if (value && value.length > 1) {
      return value[1];
    }
  }
  return undefined;
}


export function decodeJWT(str: string) {
  let jwtComponents = str.split('.');
  if (jwtComponents.length !== 3) {
    return;
  }
  let payload = jwtComponents[1];
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