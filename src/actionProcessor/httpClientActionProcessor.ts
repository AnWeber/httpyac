import { HttpRegion, HttpFile } from '../httpRegion';
import { isString, isMimeTypeFormUrlEncoded } from '../utils';
import { httpYacApi } from '../httpYacApi';
import { HttpClientOptions } from '../httpClient';
import { log } from '../logger';
const encodeUrl = require('encodeurl');


export async function httpClientActionProcessor(data: unknown, httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>): Promise<void> {
  if (httpRegion.request) {
    const options: HttpClientOptions = Object.assign({}, {
      headers: httpRegion.request.headers,
      method: httpRegion.request.method,
      body: await normalizeBody(httpRegion.request.body)
    }, httpRegion.request.options);
    if (options.body && isString(options.body) && isMimeTypeFormUrlEncoded(httpRegion.request.contentType)) {
      options.body = encodeUrl(options.body);
    }
    httpRegion.request.url = encodeUrl(httpRegion.request.url);
    try {
      log.debug('request', httpRegion.request.url, options);
      httpRegion.response = await httpYacApi.httpClient(httpRegion.request.url, options);
      log.trace('response', httpRegion.response);
    } catch (err) {
      log.error(httpRegion.request.url, options, err);
      throw err;
    }
  }
};

async function normalizeBody(body: string | Array<string | (() => Promise<Buffer>)> | undefined) {
  if (isString(body)) {
    return body;
  }else if (Array.isArray(body)) {
    const buffers: Array<Buffer> = [];
    for (const obj of body) {
      if (isString(obj)) {
        buffers.push(Buffer.from(obj));
      } else {
        buffers.push(await obj());
      }
    }
    return Buffer.concat(buffers);
  }
  return body;
}