import { ContentType, HttpMethod, HttpResponse, HttpResponseRequest, RequestLogger, TestResult, testSymbols } from '../models';
import { log } from '../logger';
import { isString, toMultiLineString } from './stringUtils';
import { parseMimeType } from './mimeTypeUtils';
import { chalkInstance } from './chalk';


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

export function requestLoggerFactoryShort(log: (args: string) => void, options?: {
  onlyFailed?: boolean;
  testResultLog?: (args: string) => void
}): RequestLogger {
  return function logResponseShort(response: HttpResponse, testResults?: Array<TestResult>) {
    if (options?.onlyFailed
      && (!testResults || testResults.every(obj => obj.result))) {
      return;
    }
    const chalk = chalkInstance();
    log(chalk`{yellow ${response.request?.method || 'GET'}} {gray ${response.request?.url || '?'}}`);
    log(chalk`{gray =>} {cyan.bold ${response.statusCode}} ({yellow ${response.timings?.total || '?'} ms}, {yellow ${response.meta?.size || '?'}})`);
    if (testResults) {
      (options?.testResultLog || log)(toMultiLineString(logTestResults(testResults, !!options?.onlyFailed)));
    }
  };
}

export function requestLoggerFactory(log: (args: string) => void, options: {
  requestOutput?: boolean;
  requestHeaders?: boolean;
  requestBodyLength?: number;
  responseHeaders?: boolean;
  responseBodyLength?: number;
  onlyFailed?: boolean;
  testResultLog?: (args: string) => void
}): RequestLogger {

  return function logResponse(response: HttpResponse, testResults?: Array<TestResult>) {
    if (options.onlyFailed
      && (!testResults || testResults.every(obj => obj.result))) {
      return;
    }
    const result: Array<string> = [];
    if (response.request && options.requestOutput) {
      result.push(...logRequest(response.request, {
        headers: options.requestHeaders,
        bodyLength: options.requestBodyLength,
      }));
    }

    if (options.responseHeaders) {
      if (result.length > 0) {
        result.push('');
      }
      result.push(...logResponseHeader(response));
    }

    if (isString(response.body) && options.responseBodyLength !== undefined) {
      if (result.length > 0) {
        result.push('');
      }
      let body = response.body;
      if (response.parsedBody) {
        body = JSON.stringify(response.parsedBody, null, 2);
      }
      body = getPartOfBody(body, options.responseBodyLength);
      result.push(body);
    }
    log(toMultiLineString(result));
    if (testResults) {
      (options?.testResultLog || log)(toMultiLineString(logTestResults(testResults, !!options?.onlyFailed)));
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
  const chalk = chalkInstance();
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
  const chalk = chalkInstance();
  const result: Array<string> = [];
  result.push(chalk`{cyan.bold HTTP/${response.httpVersion || ''}} {cyan.bold ${response.statusCode}} {bold ${response.statusMessage}}`);
  result.push(...Object.entries(response.headers)
    .filter(([key]) => !key.startsWith(':'))
    .map(([key, value]) => chalk`{yellow ${key}}: ${value}`)
    .sort());
  return result;
}

function logTestResults(testResults: Array<TestResult>, onlyFailed: boolean) {
  const chalk = chalkInstance();
  return testResults
    .filter(testResult => !onlyFailed || !testResult.result)
    .map(testResult => {
      if (testResult.result) {
        return chalk`{green ${testSymbols.ok} ${testResult.message || 'Test passed'}}`;
      }
      return chalk`{red ${testSymbols.error} ${testResult.message || 'Test failed'} (${testResult.error?.displayMessage})}`;
    });
}
