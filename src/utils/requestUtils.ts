import { log } from '../io';
import * as models from '../models';
import { isMimeTypeJSON, isMimeTypeXml, parseMimeType } from './mimeTypeUtils';
import { isString, toMultiLineString } from './stringUtils';
import { default as chalk } from 'chalk';
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

export function isWebsocketRequest(request: models.Request | undefined): request is models.WebsocketRequest {
  return request?.method === 'WS';
}

export function isEventSourceRequest(request: models.Request | undefined): request is models.EventSourceRequest {
  return request?.method === 'SSE';
}

export function isMQTTRequest(request: models.Request | undefined): request is models.MQTTRequest {
  return request?.method === 'MQTT';
}

export function isGrpcRequest(request: models.Request | undefined): request is models.GrpcRequest {
  return request?.method === 'GRPC';
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

export function getHeader<T>(headers: Record<string, T> | undefined, headerName: string): T | undefined {
  if (headers) {
    const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === headerName.toLowerCase());
    if (entry && entry.length > 1) {
      return entry[1];
    }
  }
  return undefined;
}
export function getHeaderArray(
  headers: Record<string, string | string[] | undefined> | undefined,
  headerName: string
): string[] | undefined {
  const value = getHeader(headers, headerName);
  if (value) {
    return isString(value) ? [value] : value;
  }
  return undefined;
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
  if (isHttpRequest(request) && (request.https?.certificate || request.https?.pfx)) {
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

export function cloneResponse(response: models.HttpResponse): models.HttpResponse {
  const clone: models.HttpResponse = {
    protocol: response.protocol,
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
    if (
      context.request &&
      (await context.httpFile.hooks.onRequest.trigger(context.request, context)) === models.HookCancel
    ) {
      return false;
    }
    if (
      context.request &&
      (await context.httpRegion.hooks.onRequest.trigger(context.request, context)) === models.HookCancel
    ) {
      return false;
    }

    const response = await method();
    if (response) {
      if ((await context.httpRegion.hooks.onResponse.trigger(response, context)) === models.HookCancel) {
        return false;
      }
      if ((await context.httpFile.hooks.onResponse.trigger(response, context)) === models.HookCancel) {
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
