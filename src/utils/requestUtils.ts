import { log } from '../io';
import * as models from '../models';
import { isMimeTypeJSON, isMimeTypeXml, parseMimeType } from './mimeTypeUtils';
import { isString, toMultiLineString } from './stringUtils';
import { default as chalk } from 'chalk';
import { HookCancel } from 'hookpoint';
import { TextDecoder } from 'util';
import xmlFormat from 'xml-formatter';

export function isHttpRequestMethod(method: string | undefined): method is models.HttpMethod {
  if (method) {
    return [
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
      'HEAD',
      'OPTIONS',
      'CONNECT',
      'TRACE',
      'PROPFIND',
      'PROPPATCH',
      'MKCOL',
      'COPY',
      'MOVE',
      'LOCK',
      'UNLOCK',
      'CHECKOUT',
      'CHECKIN',
      'REPORT',
      'MERGE',
      'MKACTIVITY',
      'MKWORKSPACE',
      'VERSION-CONTROL',
      'BASELINE-CONTROL', // cal-dav
    ].includes(method.toUpperCase());
  }
  return false;
}

export function isHttpRequest(request: models.Request | undefined): request is models.HttpRequest {
  return isHttpRequestMethod(request?.method);
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

  if (isString(value)) {
    return ['true', '1', 'TRUE'].indexOf(value) >= 0;
  }
  if (value === true) {
    return true;
  }
  if (value === false) {
    return false;
  }
  return defaultValue;
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
  if (isString(value)) {
    const val = Number(value);
    if (Number.isSafeInteger(val)) {
      return val;
    }
  } else if (Number.isInteger(value)) {
    return Number(value);
  }
  return undefined;
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
  responseBodyPrettyPrint?: boolean;
  responseBodyLength?: number;
  onlyFailed?: boolean;
}

export function requestLoggerFactory(
  log: (args: string) => void,
  options: RequestLoggerFactoryOptions,
  optionsFailed?: RequestLoggerFactoryOptions
): models.RequestLogger {
  return async function logResponse(response: models.HttpResponse, httpRegion?: models.HttpRegion): Promise<void> {
    let opt = options;
    if (optionsFailed && httpRegion?.testResults && httpRegion.testResults.some(obj => !obj.result)) {
      opt = optionsFailed;
    }

    if (opt.onlyFailed && (!httpRegion?.testResults || httpRegion.testResults.every(obj => obj.result))) {
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
      log(
        chalk`{gray =>} {cyan.bold ${response.statusCode}} ({yellow ${response.timings?.total || '?'} ms}, {yellow ${
          response.meta?.size || '?'
        }})`
      );
    } else {
      const result: Array<string> = [];
      if (response.request && opt.requestOutput) {
        result.push(
          ...logRequest(response.request, {
            headers: opt.requestHeaders,
            bodyLength: opt.requestBodyLength,
          })
        );
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
    timings: response.timings,
    meta: response.meta,
  };
  if (response.request) {
    clone.request = {
      ...response.request,
    };
  }
  return clone;
}

export function setAdditionalResponseBody(httpResponse: models.HttpResponse, context?: models.ProcessorContext): void {
  if (isString(httpResponse.body) && httpResponse.body.length > 0) {
    const requestPrettyPrintBodyMaxSize = context?.config?.requestPrettyPrintBodyMaxSize || 1000000;
    if (isMimeTypeJSON(httpResponse.contentType)) {
      try {
        if (!httpResponse.parsedBody) {
          httpResponse.parsedBody = JSON.parse(httpResponse.body);
        }
        if (!httpResponse.prettyPrintBody && httpResponse.body.length < requestPrettyPrintBodyMaxSize) {
          httpResponse.prettyPrintBody = JSON.stringify(httpResponse.parsedBody, null, 2);
        }
      } catch (err) {
        log.warn('json parse error', httpResponse.body, err);
      }
    } else if (
      isMimeTypeXml(httpResponse.contentType) &&
      !httpResponse.prettyPrintBody &&
      httpResponse.body.length < requestPrettyPrintBodyMaxSize
    ) {
      try {
        httpResponse.prettyPrintBody = xmlFormat(httpResponse.body, {
          collapseContent: true,
          indentation: '  ',
        });
      } catch (err) {
        log.warn('xml format error', httpResponse.body, err);
      }
    }
  }
}

export async function triggerRequestResponseHooks(
  method: () => Promise<models.HttpResponse | false>,
  context: models.ProcessorContext
): Promise<boolean> {
  try {
    const onRequest = context.httpFile.hooks.onRequest.merge(context.httpRegion.hooks.onRequest);
    if (context.request && (await onRequest.trigger(context.request, context)) === HookCancel) {
      return false;
    }

    const response = await method();
    if (response) {
      const onResponse = context.httpRegion.hooks.onResponse.merge(context.httpFile.hooks.onResponse);
      if ((await onResponse.trigger(response, context)) === HookCancel) {
        return false;
      }
      context.httpRegion.response = response;
    }
    return true;
  } catch (err) {
    log.error(context.request?.url, context.request, err);
    throw err;
  }
}
