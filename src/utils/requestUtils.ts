import { HttpMethod } from '../models';
import { log } from '../logger';


export function isRequestMethod(method: string | undefined): method is HttpMethod {
  if (method) {
    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE',
      'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK', 'CHECKOUT', 'CHECKIN', 'REPORT', 'MERGE', 'MKACTIVITY', 'MKWORKSPACE', 'VERSION-CONTROL', 'BASELINE-CONTROL' //cal-dav
    ]
      .includes(method.toUpperCase());
  }
  return false;
}

export function getHeader(headers: Record<string, string | string[] | undefined | null>, headerName: string) : string | string[] | undefined | null{
  if (headers) {
    const value = Object.entries(headers)
      .find(obj => obj[0].toLowerCase() === headerName.toLowerCase());
    if (value && value.length > 1) {
      return value[1];
    }
  }
  return undefined;
}


export interface JWTToken {
  iss?: string;
  sub?: string;
  aud?: string[];
  exp?: number;
  iat?: number;
  jti?: string;
  scope?: string;
  name?: string;
}


export function decodeJWT(str: string) : JWTToken | null{
  try {
    const jwtComponents = str.split('.');
    if (jwtComponents.length !== 3) {
      return null;
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
  } catch (err) {
    log.warn(err);
    return null;
  }
}


export function toQueryParams(params: Record<string, undefined | string | number | boolean>): string{
  return Object.entries(params)
    .filter(([, value]) => !!value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value || '')}`)
    .join('&');
}