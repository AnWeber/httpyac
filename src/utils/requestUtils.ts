import { ContentType, HttpMethod, HttpRegion, HttpResponse, HttpResponseRequest, RequestLogger } from '../models';
import { isString, toMultiLineString } from './stringUtils';
import { parseMimeType } from './mimeTypeUtils';
import { default as chalk } from 'chalk';
import { log } from '../io';


export function isRequestMethod(method: string | undefined): method is HttpMethod {
  if (method) {
    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE',
      'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK', 'CHECKOUT', 'CHECKIN', 'REPORT', 'MERGE', 'MKACTIVITY', 'MKWORKSPACE', 'VERSION-CONTROL', 'BASELINE-CONTROL' // cal-dav
    ]
      .includes(method.toUpperCase());
  }
  return false;
}

export function getHeader(headers: Record<string, string | string[] | undefined | null>, headerName: string): string | string[] | undefined | null {
  if (headers) {
    const value = Object.entries(headers)
      .find(obj => obj[0].toLowerCase() === headerName.toLowerCase());
    if (value && value.length > 1) {
      return value[1];
    }
  }
  return null;
}


export function parseContentType(headers: Record<string, string | string[] | null | undefined>): ContentType | undefined {
  const contentType = getHeader(headers, 'content-type');
  if (isString(contentType)) {
    return parseMimeType(contentType);
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


export function decodeJWT(str: string): JWTToken | null {
  try {
    const jwtComponents = str.split('.');
    if (jwtComponents.length !== 3) {
      return null;
    }
    let payload = jwtComponents[1];
    payload = payload.replace(/-/gu, '+');
    payload = payload.replace(/_/gu, '/');
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


export function toQueryParams(params: Record<string, undefined | string | number | boolean>): string {
  return Object.entries(params)
    .filter(([, value]) => !!value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value || '')}`)
    .join('&');
}

export interface RequestLoggerFactoryOptions {
  useShort?: boolean;
  requestOutput?: boolean;
  requestHeaders?: boolean;
  requestBodyLength?: number;
  responseHeaders?: boolean;
  responseBodyPrettyPrint?: boolean,
  responseBodyLength?: number;
  onlyFailed?: boolean;
}

export function requestLoggerFactory(
  log: (args: string) => void,
  options: RequestLoggerFactoryOptions,
  optionsFailed?: RequestLoggerFactoryOptions
): RequestLogger {

  return function logResponse(response: HttpResponse, httpRegion?: HttpRegion) {

    let opt = options;
    if (optionsFailed && httpRegion?.testResults && httpRegion.testResults.some(obj => !obj.result)) {
      opt = optionsFailed;
    }

    if (opt.onlyFailed
        && (!httpRegion?.testResults || httpRegion.testResults.every(obj => obj.result))) {
      return;
    }

    log('');
    log('---------------------');
    log('');
    if (httpRegion?.metaData?.title || httpRegion?.metaData?.description) {
      if (httpRegion?.metaData?.title) {
        log(chalk`{gray === ${httpRegion.metaData.title} ===}`);
      }
      if (httpRegion?.metaData?.description) {
        log(chalk`{gray ${httpRegion.metaData.description}}`);
      }
      log('');
    }
    if (opt.useShort) {
      log(chalk`{yellow ${response.request?.method || 'GET'}} {gray ${response.request?.url || '?'}}`);
      log(chalk`{gray =>} {cyan.bold ${response.statusCode}} ({yellow ${response.timings?.total || '?'} ms}, {yellow ${response.meta?.size || '?'}})`);
    } else {

      const result: Array<string> = [];
      if (response.request && opt.requestOutput) {
        result.push(...logRequest(response.request, {
          headers: opt.requestHeaders,
          bodyLength: opt.requestBodyLength,
        }));
      }

      if (opt.responseHeaders) {
        if (result.length > 0) {
          result.push('');
        }
        result.push(...logResponseHeader(response));
      }

      if (isString(response.body) && opt.responseBodyLength !== undefined) {
        if (result.length > 0) {
          result.push('');
        }
        let body = response.body;
        if (options.responseBodyPrettyPrint && response.prettyPrintBody) {
          body = response.prettyPrintBody;
        }
        body = getPartOfBody(body, opt.responseBodyLength);
        result.push(body);
      }
      log(toMultiLineString(result));
    }
  };
}

function getPartOfBody(body: string, length: number) {
  let result = body;
  if (length > 0) {
    result = body.slice(0, Math.min(body.length, length));
    if (body.length >= length) {
      result += `... (${body.length - length} characters  more)`;
    }
  }
  return result;
}

function logRequest(request: HttpResponseRequest, options: {
  headers?: boolean,
  bodyLength?: number,
}) {
  const result: Array<string> = [];
  result.push(chalk`{cyan.bold ${request.method} ${request.url}}`);
  if (request.headers && options.headers) {
    result.push(...Object.entries(request.headers)
      .map(([key, value]) => chalk`{yellow ${key}}: ${value}`)
      .sort());
  }
  if (request.https?.certificate || request.https?.pfx) {
    result.push(chalk`{yellow client-cert}: true`);
  }
  if (isString(request.body) && options.bodyLength !== undefined) {
    result.push('');
    result.push(chalk`{gray ${getPartOfBody(request.body, options.bodyLength)}}`);
  }
  return result;
}

function logResponseHeader(response: HttpResponse) {
  const result: Array<string> = [];
  result.push(chalk`{cyan.bold HTTP/${response.httpVersion || ''}} {cyan.bold ${response.statusCode}} {bold ${response.statusMessage}}`);
  result.push(...Object.entries(response.headers)
    .filter(([key]) => !key.startsWith(':'))
    .map(([key, value]) => chalk`{yellow ${key}}: ${value}`)
    .sort());
  return result;
}


export function cloneResponse(response: HttpResponse): HttpResponse {
  const clone: HttpResponse = {
    statusCode: response.statusCode,
    statusMessage: response.statusMessage,
    httpVersion: response.httpVersion,
    headers: response.headers,
    body: response.body,
    rawBody: response.rawBody,
    parsedBody: response.parsedBody,
    prettyPrintBody: response.prettyPrintBody,
    contentType: response.contentType,
    timings: response.timings,
    meta: response.meta,
  };
  if (response.request) {
    clone.request = {
      method: response.request.method,
      url: response.request.url,
      headers: response.request.headers,
      body: response.request.body,
    };
  }
  return clone;
}
