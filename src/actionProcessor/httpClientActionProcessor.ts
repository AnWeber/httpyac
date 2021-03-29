import {ProcessorContext, HttpRequest, HttpClientOptions} from '../models';
import { isString, isMimeTypeFormUrlEncoded} from '../utils';
import { log } from '../logger';
import merge from 'lodash/merge';
const encodeUrl = require('encodeurl');


export async function httpClientActionProcessor(data: unknown, context: ProcessorContext): Promise<boolean> {
  const { httpRegion, httpClient, request } = context;
  if (request) {

    const options: HttpClientOptions = await initOptions(request, httpRegion.metaData.proxy);
    options.followRedirect = !httpRegion.metaData.noRedirect;
    try {
      const response = await httpClient(options, context);
      if (response) {
        response.request = options;
        httpRegion.response = response;
        return true;
      }
    } catch (err) {
      log.error(request.url, options);
      throw err;
    }
  }
  return false;
}

async function initOptions(request: HttpRequest, proxy: string | undefined) {
  const options: HttpClientOptions = merge({
    url: encodeUrl(request.url),
    headers: request.headers,
    method: request.method,
    body: await normalizeBody(request.body),
    proxy
  }, request.options);
  if (options.body && isString(options.body) && isMimeTypeFormUrlEncoded(request.contentType)) {
    options.body = encodeUrl(options.body);
  }
  return options;
}

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
