import { HttpClient, HttpClientContext, HttpRequest, HttpResponse, RepeatOrder } from './models';
import { isString, isMimeTypeJSON, parseContentType } from './utils';
import { default as got, OptionsOfUnknownResponseBody, CancelError, Response } from 'got';
import merge from 'lodash/merge';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { default as filesize } from 'filesize';
import { log } from './logger';


export function gotHttpClientFactory(defaultsOverride: HttpRequest | undefined) : HttpClient {
  return async function gotHttpClient(request: HttpRequest, context: HttpClientContext) : Promise<HttpResponse | false> {
    try {
      const defaults: OptionsOfUnknownResponseBody = {
        decompress: true,
        retry: 0,
        throwHttpErrors: false,
        headers: {
          'accept': '*/*',
          'user-agent': 'httpyac',
        }
      };

      const url = request.url;

      if (!url) {
        throw new Error('empty url');
      }
      const mergedRequest: HttpRequest = merge({}, defaults,
        defaultsOverride,
        request);
      delete mergedRequest.url;
      initProxy(mergedRequest);

      const options: OptionsOfUnknownResponseBody = toGotOptions(mergedRequest);
      log.trace('request', options);
      let response: HttpResponse | false;
      if (context.repeat && context.repeat.count > 0) {
        response = await loadRepeat(url, options, context.repeat.type, context.repeat.count);
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

  function toGotOptions(mergedRequest: HttpRequest): OptionsOfUnknownResponseBody {
    const options: OptionsOfUnknownResponseBody = {};
    Object.assign(options, mergedRequest); // HACK ignore type of body
    return options;
  }
}


async function loadRepeat(url: string, options: OptionsOfUnknownResponseBody, repeatOrder: RepeatOrder, count: number) {

  const loadFunc = async () => toHttpResponse(await got(url, options));
  const loader: Array<() => Promise<HttpResponse>> = [];
  for (let index = 0; index < count; index++) {
    loader.push(loadFunc);
  }
  if (repeatOrder === RepeatOrder.parallel) {
    return mergeHttpResponse(await Promise.all(loader.map(obj => obj())));
  }
  const responses = [];
  for (const load of loader) {
    responses.push(await load());
  }
  return mergeHttpResponse(responses);
}

async function load(url: string, options: OptionsOfUnknownResponseBody, context: HttpClientContext) {
  const responsePromise = got(url, options);

  let prevPercent = 0;
  if (context.showProgressBar) {

    responsePromise.on('downloadProgress', data => {
      const newData = data.percent - prevPercent;
      prevPercent = data.percent;
      if (context.progress) {
        context.progress.report({
          message: url,
          increment: newData * 100,
        });
      }
    });
  }
  const dispose = context.progress && context.progress.register(() => {
    responsePromise.cancel();
  });

  const response = await responsePromise;
  if (dispose) {
    dispose();
  }
  return toHttpResponse(response);
}

function initProxy(request: HttpRequest) {
  if (request.proxy) {
    request.agent = {
      http: new HttpProxyAgent(request.proxy),
      https: new HttpsProxyAgent(request.proxy)
    };
    delete request.proxy;
  }
}


function toHttpResponse(response: Response<unknown>): HttpResponse {
  const httpResponse: HttpResponse = {
    statusCode: response.statusCode,
    statusMessage: response.statusMessage,
    body: response.body,
    rawBody: response.rawBody,
    headers: response.headers,
    timings: response.timings.phases,
    httpVersion: response.httpVersion,
    request: response.request.options,
    contentType: parseContentType(response.headers),
    meta: {
      ip: response.ip,
      redirectUrls: response.redirectUrls,
      size: filesize(response.rawHeaders.map(obj => obj.length).reduce((size, current) => size + current, 0) + response.rawBody.length),
    }
  };
  delete response.headers[':status'];
  if (httpResponse.httpVersion && httpResponse.httpVersion.startsWith('HTTP/')) {
    httpResponse.httpVersion = httpResponse.httpVersion.slice('HTTP/'.length);
  }

  setParseBody(httpResponse);
  return httpResponse;
}

export function setParseBody(httpResponse: HttpResponse) : void {
  if (isMimeTypeJSON(httpResponse.contentType)
    && isString(httpResponse.body)
    && httpResponse.body.length > 0) {
    try {
      httpResponse.parsedBody = JSON.parse(httpResponse.body);
    } catch (err) {
      log.warn('json parse error', httpResponse.body, err);
    }
  }
}

function mergeHttpResponse(responses: Array<HttpResponse>): HttpResponse | false {
  const statusCode = responses.map(obj => obj.statusCode)
    .reduce((prev, curr) => Math.max(prev, curr), 0);
  const response = responses.find(obj => obj.statusCode === statusCode);
  if (response) {

    response.parsedBody = responses.map(obj => {
      if (isString(obj.body) && isMimeTypeJSON(obj.contentType)) {
        obj.body = JSON.parse(obj.body);
      }
      delete obj.rawBody;
      return obj;
    });
    response.body = JSON.stringify(response.parsedBody);

    return {
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
      body: response.body,
      rawBody: response.rawBody,
      headers: response.headers,
      timings: response.timings
    };
  }
  return false;
}
