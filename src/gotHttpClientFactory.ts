import { HttpClientContext, HttpClientOptions, HttpResponse, RepeatOrder } from './models';
import { getHeader, isString, parseMimeType, isMimeTypeJSON } from './utils';
import { default as got, OptionsOfUnknownResponseBody, CancelError, Response } from 'got';
import merge from 'lodash/merge';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { default as filesize } from 'filesize';


export function gotHttpClientFactory(defaultsOverride: OptionsOfUnknownResponseBody = {}) {
  return async function gotHttpClient(clientOptions: HttpClientOptions, context: HttpClientContext) {
    try {
      const defaults: OptionsOfUnknownResponseBody = {
        decompress: true,
        retry: 0,
        throwHttpErrors: false,
        http2: true,
      };

      const url = clientOptions.url;
      const optionList = [
        defaults,
        defaultsOverride,
        clientOptions,
        initProxy(clientOptions),
      ];
      const options: OptionsOfUnknownResponseBody = merge({}, ...optionList);
      delete options.url;

      let response: HttpResponse | false;
      if (context.repeat && context.repeat.count > 0) {
        response = await loadRepeat(url, options, context.repeat.type, context.repeat.count);
      } else {
        response = await load(url, options, context);
      }

      if (response) {

        const contentType = getHeader(response.headers, 'content-type');
        if (isString(contentType)) {
          response.contentType = parseMimeType(contentType);
        }
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


async function loadRepeat(url: string, options: OptionsOfUnknownResponseBody, repeatOrder: RepeatOrder, count: number) {

  const loadFunc = async () => toHttpResponse(await got(url, options));
  const loader: Array<() => Promise<HttpResponse>> = [];
  for (let index = 0; index < count; index++){
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
    responsePromise.on("downloadProgress", data => {
      const newData = data.percent - prevPercent;
      prevPercent = data.percent;
      context.progress && context.progress.report({
        message: url,
        increment: newData * 100,
      });
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

function initProxy(clientOptions: HttpClientOptions): OptionsOfUnknownResponseBody {
  const options: OptionsOfUnknownResponseBody = {};
  if (clientOptions.proxy) {
    options.agent = {
      http: new HttpProxyAgent(clientOptions.proxy),
      https: new HttpsProxyAgent(clientOptions.proxy)
    };
    delete clientOptions.proxy;
  }
  return options;
}


function toHttpResponse(response: Response<unknown>): HttpResponse {
  return {
    statusCode: response.statusCode,
    statusMessage: response.statusMessage,
    body: response.body,
    rawBody: response.rawBody,
    headers: response.headers,
    timings: response.timings.phases,
    httpVersion: response.httpVersion,
    meta: {
      ip: response.ip,
      redirectUrls: response.redirectUrls,
      size: filesize(response.rawHeaders.map(obj => obj.length).reduce((size, current) => size + current, 0) + response.rawBody.length),
    }
  };
}

function mergeHttpResponse(responses: Array<HttpResponse>): HttpResponse | false {
  const statusCode = responses.map(obj => obj.statusCode).reduce((prev, curr) => Math.max(prev, curr), 0);
  const response = responses.find(obj => obj.statusCode === statusCode);
  if (response) {

    response.body = JSON.stringify(responses.map(obj => {
      if (isString(obj.body) && isMimeTypeJSON(obj.contentType)) {
        obj.body = JSON.parse(obj.body);
      }
      delete obj.rawBody;
      return obj;
    }));

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