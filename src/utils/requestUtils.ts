import { default as chalk } from 'chalk';
import { TextDecoder } from 'util';

import { log } from '../io';
import * as models from '../models';
import { toBoolean, toNumber } from './convertUtils';
import { parseMimeType } from './mimeTypeUtils';
import { isString, toMultiLineArray, toMultiLineString } from './stringUtils';

export function isHttpRequestMethod(method: string | undefined): method is models.HttpMethod {
  if (method) {
    return [
      'ACL',
      'BASELINE-CONTROL',
      'CHECKIN',
      'CHECKOUT',
      'CONNECT',
      'COPY',
      'DELETE',
      'GET',
      'GRAPHQL',
      'HEAD',
      'LOCK',
      'MERGE',
      'MKACTIVITY',
      'MKCALENDAR',
      'MKCOL',
      'MKWORKSPACE',
      'MOVE',
      'OPTIONS',
      'PATCH',
      'POST',
      'PROPFIND',
      'PROPPATCH',
      'PUT',
      'REPORT',
      'SEARCH',
      'TRACE',
      'UNLOCK',
      'VERSION-CONTROL',
    ].includes(method.toUpperCase());
  }
  return false;
}

export function isHttpRequest(request: models.Request | undefined): request is models.HttpRequest {
  return request?.protocol === 'HTTP';
}

export function deleteHeader(headers: Record<string, unknown> | undefined, ...headerNames: string[]): void {
  if (headers) {
    for (const headerName of headerNames) {
      const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === headerName.toLowerCase());
      if (entry && entry.length > 1) {
        delete headers[entry[0]];
      }
    }
  }
}

export function getHeaderString(
  headers: Record<string, string | string[] | undefined> | undefined,
  headerName: string
): string | undefined {
  const value = getHeader(headers, headerName);

  if (isString(value)) {
    return value;
  }
  return undefined;
}

export function getHeaderBoolean(
  headers: Record<string, string | string[] | boolean | undefined> | undefined,
  headerName: string,
  defaultValue = false
): boolean {
  const value = getHeader(headers, headerName);

  return toBoolean(value, defaultValue);
}

export function getHeader<T>(headers: Record<string, T> | undefined, headerName: string): T | undefined {
  if (headers) {
    const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === headerName.toLowerCase());
    if (entry && entry.length > 1) {
      return entry[1];
    }
  }
  return undefined;
}

export function getHeaderNumber<T>(headers: Record<string, T> | undefined, headerName: string): number | undefined {
  const value = getHeader(headers, headerName);
  return toNumber(value);
}

export function getHeaderArray(
  headers: Record<string, string | string[] | undefined> | undefined,
  headerName: string,
  defaultValue: Array<string> = []
): Array<string> {
  const value = getHeader(headers, headerName);
  if (value) {
    return isString(value) ? [value] : value;
  }
  return defaultValue;
}

export function parseContentType(headers: Record<string, unknown>): models.ContentType | undefined {
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

    const result = new TextDecoder().decode(Buffer.from(payload, 'base64'));
    return JSON.parse(result);
  } catch (err) {
    log.warn(err);
    return null;
  }
}

export function toQueryParams(
  params: Record<string, undefined | string | number | boolean | null | Array<string | number | boolean>>
): string {
  return Object.entries(params)
    .filter(([, value]) => !!value)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(val => `${key}=${encodeURIComponent(val || '')}`).join('&');
      }
      return `${key}=${encodeURIComponent(value || '')}`;
    })
    .join('&');
}

export function requestLoggerFactory(
  log: (args: string) => void,
  options?: models.RequestLoggerFactoryOptions,
  optionsFailed?: models.RequestLoggerFactoryOptions
): models.RequestLogger {
  return async function logResponse(
    response: models.HttpResponse | undefined,
    httpRegion?: models.HttpRegion
  ): Promise<void> {
    let opt = options;
    if (
      optionsFailed &&
      httpRegion?.testResults &&
      httpRegion.testResults.some(obj =>
        [models.TestResultStatus.FAILED, models.TestResultStatus.ERROR].includes(obj.status)
      )
    ) {
      opt = optionsFailed;
    }

    if (!opt) {
      return;
    }

    if (
      opt.onlyFailed &&
      (!httpRegion?.testResults || httpRegion.testResults.every(obj => obj.status === models.TestResultStatus.SUCCESS))
    ) {
      return;
    }

    log('');
    log('---------------------');
    log('');
    if (httpRegion?.metaData?.title || httpRegion?.metaData?.name || httpRegion?.metaData?.description) {
      const title = httpRegion?.metaData?.title || httpRegion?.metaData?.name;
      if (title) {
        log(chalk`{gray === ${title} ===}`);
      }
      if (httpRegion?.metaData?.description) {
        log(chalk`{gray ${httpRegion.metaData.description}}`);
      }
      log('');
    }

    const request = response?.request || httpRegion?.request;
    if (request) {
      if (opt.useShort) {
        log(chalk`{yellow ${request?.method || 'GET'}} {gray ${request?.url || '?'}}`);
      } else if (opt.requestOutput) {
        logRequest(request, {
          headers: opt.requestHeaders,
          bodyLength: opt.requestBodyLength,
        }).forEach(m => log(m));
      }
    }

    if (response) {
      if (opt.useShort) {
        log(
          chalk`{gray =>} {cyan.bold ${response.statusCode}} ({yellow ${response.timings?.total || '?'} ms}, {yellow ${
            response.meta?.size || '?'
          }})`
        );
      } else {
        const result: Array<string> = [];

        if (opt.responseHeaders) {
          if (result.length > 0) {
            result.push('');
          }
          result.push(...logResponseHeader(response));
        }
        if (opt.timings) {
          if (result.length > 0) {
            result.push('');
          }
          result.push(...logTimings(response));
        }
        if (isString(response.body) && opt.responseBodyLength !== undefined) {
          let body: string | undefined = response.body;
          if (opt.responseBodyPrettyPrint && response.prettyPrintBody) {
            body = response.prettyPrintBody;
          }
          body = getPartOfBody(body, opt.responseBodyLength);
          if (body) {
            if (result.length > 0) {
              result.push('');
            }
            result.push(body);
          }
        }
        log(toMultiLineString(result));
      }
    }

    if (httpRegion?.testResults) {
      for (const testResult of httpRegion.testResults) {
        let message = chalk`{green ${models.testSymbols.ok} ${testResult.message || 'Test passed'}}`;
        if (testResult.status === models.TestResultStatus.SKIPPED) {
          message = chalk`{yellow ${models.testSymbols.skipped} Test skipped}`;
        } else if ([models.TestResultStatus.ERROR, models.TestResultStatus.FAILED].includes(testResult.status)) {
          const errorMessage = testResult.error ? ` (${testResult.error?.displayMessage})` : '';
          message = chalk`{red ${models.testSymbols.error} ${testResult.message || 'Test failed'}${errorMessage}}`;

          if (
            !options?.useShort &&
            testResult.status === models.TestResultStatus.ERROR &&
            testResult.error?.error.stack
          ) {
            const linesOfStack = toMultiLineArray(testResult.error.error.stack).slice(0, 3);
            message = toMultiLineString([message, ...linesOfStack]);
          }
        }
        log(message);
      }
    }
  };
}

export function getPartOfBody(body: string, length: number | undefined) {
  let result = body;
  if (typeof length === 'undefined' || length < 0) {
    return undefined;
  }
  if (length > 0) {
    result = body.slice(0, Math.min(body.length, length));
    if (body.length >= length) {
      result += `... (${body.length - length} characters more)`;
    }
  }
  return result;
}

function logRequest(
  request: models.Request,
  options: {
    headers?: boolean;
    bodyLength?: number;
  }
) {
  const result: Array<string> = [];
  result.push(chalk`{cyan.bold ${request.method} ${request.url}}`);
  if (request.headers && options.headers) {
    result.push(
      ...Object.entries(request.headers)
        .map(([key, value]) => chalk`{yellow ${key}}: ${value}`)
        .sort()
    );
  }
  if (isHttpRequest(request) && (request.options?.https?.certificate || request.options?.https?.pfx)) {
    result.push(chalk`{yellow client-cert}: true`);
  }
  if (isString(request.body) && options.bodyLength !== undefined) {
    result.push('');
    result.push(chalk`{gray ${getPartOfBody(request.body, options.bodyLength)}}`);
  }
  return result;
}

function logResponseHeader(response: models.HttpResponse) {
  const result: Array<string> = [];
  result.push(
    chalk`{cyan.bold ${response.protocol}} {cyan.bold ${response.statusCode}} {bold ${
      response.statusMessage ? ` - ${response.statusMessage}` : ''
    }}`
  );
  if (response.headers) {
    result.push(
      ...Object.entries(response.headers)
        .filter(([key]) => !key.startsWith(':'))
        .map(([key, value]) => chalk`{yellow ${key}}: ${value}`)
        .sort()
    );
  }
  return result;
}

function logTimings(response: models.HttpResponse) {
  const result: Array<string> = [];

  if (response.timings) {
    result.push(chalk`{cyan.bold Timings}:`);
    result.push(
      ...Object.entries(response.timings)
        .filter(([, value]) => !!value)
        .map(([key, value]) => chalk`{yellow ${key}}: ${value}`)
        .sort()
    );
  }
  return result;
}

export function cloneRequest(request: models.Request): models.Request {
  const clone: models.Request = {
    url: request.url,
    method: request.method,
    body: request.body,
    contentType: request.contentType && {
      ...request.contentType,
    },
    headers: request.headers && {
      ...request.headers,
    },
    supportsStreaming: request.supportsStreaming,
  };
  return clone;
}

export function isHttpResponse(val: unknown): val is models.HttpResponse {
  const obj = val as models.HttpResponse;
  return !!obj?.statusCode;
}

export function shrinkCloneResponse(response: models.HttpResponse): models.HttpResponse {
  const clone = cloneResponse(response);
  delete clone.rawBody;
  delete clone.prettyPrintBody;
  delete clone.request;
  return clone;
}

export function cloneResponse(response: models.HttpResponse): models.HttpResponse {
  const clone: models.HttpResponse = {
    name: response.name,
    protocol: response.protocol,
    statusCode: response.statusCode,
    statusMessage: response.statusMessage,
    httpVersion: response.httpVersion,
    headers: response.headers,
    body: response.body,
    rawHeaders: response.rawHeaders,
    rawBody: response.rawBody,
    parsedBody: response.parsedBody,
    prettyPrintBody: response.prettyPrintBody,
    contentType: response.contentType,
    timings: response.timings && {
      ...response.timings,
    },
    meta: response.meta,
    tags: response.tags,
    request: response.request && cloneRequest(response.request),
  };
  return clone;
}

/**
 * Merges a raw HTTP headers array from a got HTTP Response into a record that
 * groups same-named lower-cased HTTP Headers to arrays of values.
 * I.e. HTTP headers that only appear once will be associated with a single-item string-array,
 * Headers that appear multiple times (e.g. Set-Cookie) are stored in multi-item string-arrays in order of appearance.
 * @param rawHeaders A raw HTTP headers array, even numbered indices represent HTTP header names, odd numbered indices represent header values.
 */
export function mergeRawHttpHeaders(rawHeaders: string[]): Record<string, string[]> {
  const mergedHeaders: Record<string, string[]> = {};
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const headerRawName = rawHeaders[i];
    const headerRawValue = rawHeaders[i + 1];
    if (typeof headerRawValue === 'undefined') {
      continue; // Likely at end of array, continue will make for-condition to evaluate falsy
    }
    const headerName = headerRawName.toLowerCase();
    mergedHeaders[headerName] = mergedHeaders[headerName] || [];
    mergedHeaders[headerName].push(headerRawValue);
  }
  return mergedHeaders;
}
