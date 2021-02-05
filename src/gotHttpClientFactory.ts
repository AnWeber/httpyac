import { HttpClientOptions, HttpResponse, Progress } from './models';
import { getHeader, isString, parseMimeType } from './utils';
import { default as got, OptionsOfUnknownResponseBody, CancelError } from 'got';
import merge from 'lodash/merge';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { default as filesize } from 'filesize';


export function gotHttpClientFactory(defaultsOverride: OptionsOfUnknownResponseBody = {}) {
  return async function gotHttpClient(clientOptions: HttpClientOptions, progress: Progress |undefined) {
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

      const responsePromise = got(url, options);

      let dispose: (() => void) | undefined;
      let prevPercent = 0;
      if (progress) {
        if (progress.showProgressBar) {
          responsePromise.on("downloadProgress", data => {
            const newData = data.percent - prevPercent;
            prevPercent = data.percent;
            progress.report({
              message: url,
              increment: newData * 100,
            });
          });
        }
        dispose = progress.register(() => {
          responsePromise.cancel();
        });
      }
      const response = await responsePromise;

      if (dispose) {
        dispose();
      }
      const result: HttpResponse = {
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

      const contentType = getHeader(response.headers, 'content-type');
      if (isString(contentType)) {
        result.contentType = parseMimeType(contentType);
      }
      return result;

    } catch (err) {
      if (err instanceof CancelError) {
        return false;
      }
      throw err;
    }
  };
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
