import { log, userInteractionProvider } from '../../io';
import * as models from '../../models';
import { parseContentType, repeat } from '../../utils';
import { default as filesize } from 'filesize';
import { default as got, OptionsOfUnknownResponseBody, CancelError, Response } from 'got';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import merge from 'lodash/merge';
import { SocksProxyAgent } from 'socks-proxy-agent';

export async function gotHttpClient(
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
      context?.config?.request,
      request.options,
      requestToOptions(request)
    );
    initProxy(options, request.proxy || context?.config?.proxy);

    log.debug('request', options);

    const response = await repeat(async () => {
      if (context.progress && context.progress.isCanceled()) {
        return undefined;
      }
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
    }, context);

    if (response) {
      response.name = `${response.statusCode} - ${request.method || 'GET'} ${request.url}`;
      return response;
    }
    throw new Error('no response');
  } catch (err) {
    if (err instanceof CancelError) {
      return false;
    }
    throw err;
  }
}

function requestToOptions(request: models.HttpClientRequest): OptionsOfUnknownResponseBody {
  const result: Record<string, unknown> = {};
  const warnHeaders: Array<string> = [];

  const ignoreHeaders = ['protocol', 'url', 'proxy', 'options', 'rawBody', 'contentType'];
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
    name: `${response.request}`,
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
