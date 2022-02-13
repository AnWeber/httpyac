import { log, userInteractionProvider } from '../io';
import * as models from '../models';
import { parseContentType } from './requestUtils';
import { default as filesize } from 'filesize';
import { default as got, OptionsOfUnknownResponseBody, CancelError, Response } from 'got';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import merge from 'lodash/merge';
import { SocksProxyAgent } from 'socks-proxy-agent';

interface HttpClientOverrideOptions {
  options?: OptionsOfUnknownResponseBody;
  proxy?: string;
}

export function gotHttpClientFactory(defaultsOverride: HttpClientOverrideOptions | undefined): models.HttpClient {
  return async function gotHttpClient(
    request: models.HttpClientRequest,
    context: models.HttpClientContext
  ): Promise<models.HttpResponse | false> {
    try {
      const defaults: OptionsOfUnknownResponseBody = {
        decompress: true,
        retry: 0,
        throwHttpErrors: false,
        headers: {
          accept: '*/*',
          'user-agent': 'httpyac',
        },
      };

      const url = request.url;

      if (!url) {
        throw new Error('empty url');
      }
      const options: OptionsOfUnknownResponseBody = merge(
        {},
        defaults,
        defaultsOverride?.options,
        request.options,
        requestToOptions(request)
      );
      initProxy(options, request.proxy || defaultsOverride?.proxy);

      log.debug('request', options);
      let response: models.HttpResponse | undefined;
      if (context.repeat && context.repeat.count > 0) {
        response = await loadRepeat(url, options, context);
      } else {
        response = await load(url, options, context);
      }
      if (response) {
        return response;
      }
      throw new Error('no response');
    } catch (err) {
      if (err instanceof CancelError) {
        return false;
      }
      throw err;
    }
  };
}

function requestToOptions(request: models.HttpClientRequest): OptionsOfUnknownResponseBody {
  const result: Record<string, unknown> = {};
  const warnHeaders: Array<string> = [];

  const ignoreHeaders = ['url', 'proxy', 'options', 'rawBody', 'contentType'];
  for (const [key, value] of Object.entries(request)) {
    if (['method', 'body', 'headers'].indexOf(key) >= 0) {
      result[key] = value;
    } else if (ignoreHeaders.indexOf(key) < 0) {
      warnHeaders.push(key);
      result[key] = value;
    }
  }

  if (warnHeaders.length > 0) {
    const message = `Please use request.options[...] instead of request[...] for setting Got Options (${warnHeaders.join(
      ','
    )}). Support will be removed`;
    userInteractionProvider.showWarnMessage?.(message);
    log.warn(message);
  }
  return result;
}

async function loadRepeat(url: string, options: OptionsOfUnknownResponseBody, context: models.HttpClientContext) {
  const loadFunc = async () => toHttpResponse(await got(url, options));
  const loader: Array<() => Promise<models.HttpResponse>> = [];
  for (let index = 0; index < (context.repeat?.count || 1); index++) {
    loader.push(loadFunc);
  }
  if (context.repeat?.type === models.RepeatOrder.parallel) {
    const responses = await Promise.all(loader.map(obj => obj()));
    return responses.pop();
  }
  const responses = [];
  for (const load of loader) {
    responses.push(await load());
  }
  return responses.pop();
}

async function load(url: string, options: OptionsOfUnknownResponseBody, context: models.HttpClientContext) {
  const responsePromise = got(url, options);

  let prevPercent = 0;
  if (context.showProgressBar) {
    responsePromise.on('downloadProgress', data => {
      const newData = data.percent - prevPercent;
      prevPercent = data.percent;

      if (context.progress?.report) {
        log.debug('call http request');
        context.progress.report({
          message: 'call http request',
          increment: newData * 100,
        });
      }
    });
  }
  const dispose =
    context.progress &&
    context.progress.register(() => {
      responsePromise.cancel();
    });

  const response = await responsePromise;
  if (dispose) {
    dispose();
  }
  return toHttpResponse(response);
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

function toHttpResponse(response: Response<unknown>): models.HttpResponse {
  const httpResponse: models.HttpResponse = {
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
          response.rawBody.length
      ),
    },
  };
  delete response.headers[':status'];
  if (httpResponse.httpVersion && httpResponse.httpVersion.startsWith('HTTP/')) {
    httpResponse.httpVersion = httpResponse.httpVersion.slice('HTTP/'.length);
  }

  return httpResponse;
}

function getBody(body: unknown) {
  if (typeof body === 'string') {
    return body;
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  return undefined;
}

export function initHttpClient(content: { config?: models.EnvironmentConfig }): models.HttpClient {
  const request = {
    options: content.config?.request,
    proxy: content.config?.proxy,
  };
  return gotHttpClientFactory(request);
}

/**
 * Merges a raw HTTP headers array from a got HTTP Response into a record that
 * groups same-named lower-cased HTTP Headers to arrays of values.
 * I.e. HTTP headers that only appear once will be associated with a single-item string-array,
 * Headers that appear multiple times (e.g. Set-Cookie) are stored in multi-item string-arrays in order of appearence.
 * @param rawHeaders A raw HTTP headers array, even numbered indicies represent HTTP header names, odd numbered indicies represent header values.
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
    mergedHeaders[headerName] ||= [];
    mergedHeaders[headerName].push(headerRawValue);
  }
  return mergedHeaders;
}
