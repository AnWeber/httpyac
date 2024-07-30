import { filesize } from 'filesize';
import { CancelError, default as got, OptionsOfUnknownResponseBody, Response } from 'got';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import merge from 'lodash/merge';
import { SocksProxyAgent } from 'socks-proxy-agent';

import { log } from '../../io';
import * as models from '../../models';
import { parseContentType, toString } from '../../utils';

export async function gotHttpClient(
  request: models.HttpClientRequest,
  context: models.HttpClientContext
): Promise<models.HttpResponse | false> {
  try {
    const options = getClientOptions(request, context);

    const cancelableRequest = got(request.url || '', options);
    const response = await cancelableRequest;
    return toHttpResponse(response, request);
  } catch (err) {
    if (err instanceof CancelError) {
      return false;
    }
    throw err;
  }
}

export function getClientOptions(
  request: models.HttpRequest,
  context: models.HttpClientContext
): OptionsOfUnknownResponseBody {
  const { config } = context;

  const options: OptionsOfUnknownResponseBody = merge(
    {
      decompress: true,
      retry: 0,
      throwHttpErrors: false,
      allowGetBody: true,
    },
    config?.request,
    {
      method: request.method,
      headers: request.headers,
      body: request.body,
      timeout: request.timeout,
    },
    request.options
  );

  if (request.noRedirect) {
    options.followRedirect = false;
  }
  if (request.noRejectUnauthorized) {
    options.https = request.options?.https || {};
    options.https.rejectUnauthorized = false;
  }
  initProxy(options, request.proxy);
  ensureStringHeaders(options.headers);

  log.debug('request', options);
  return options;
}

function initProxy(options: OptionsOfUnknownResponseBody, proxy: string | undefined) {
  if (proxy) {
    if (proxy.startsWith('socks://')) {
      const socksProxy = new SocksProxyAgent(proxy);
      options.agent = {
        http: socksProxy,
        https: socksProxy,
      };
    } else {
      options.agent = {
        http: new HttpProxyAgent(proxy),
        https: new HttpsProxyAgent(proxy),
      };
    }
  }
}
function ensureStringHeaders(headers?: Record<string, unknown>) {
  if (headers) {
    for (const [header, val] of Object.entries(headers)) {
      if (typeof val !== 'undefined') {
        let result: string | string[];
        if (Array.isArray(val)) {
          result = val.map(obj => toString(obj) || obj);
        } else {
          result = toString(val) || '';
        }
        headers[header] = result;
      }
    }
  }
}

export function toHttpResponse(response: Response<unknown>, request: models.Request) {
  return {
    name: `${response.statusCode} - ${request.method || 'GET'} ${request.url}`,
    statusCode: response.statusCode,
    protocol: `HTTP/${response.httpVersion}`,
    statusMessage: response.statusMessage,
    body: response.body,
    rawHeaders: response.rawHeaders,
    rawBody: response.rawBody,
    headers: response.headers,
    timings: response.timings.phases,
    httpVersion: response.httpVersion,
    request: {
      protocol: 'HTTP',
      method: response.request.options.method,
      url: `${response.request.options.url}`,
      headers: response.request.options.headers,
      body: getBody(response.request.options.body),
    },
    contentType: parseContentType(response.headers),
    meta: {
      ip: response.ip,
      redirectUrls: response.redirectUrls,
      size: filesize(
        response.rawHeaders.map(obj => obj.length).reduce((size, current) => size + current, 0) +
          (response.rawBody?.length || 0)
      ),
    },
  };
}
export function getBody(body: unknown) {
  if (typeof body === 'string') {
    return body;
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  return undefined;
}
