import {ProcessorContext, HttpRequest} from '../models';
import { isString, isMimeTypeFormUrlEncoded} from '../utils';
import { log } from '../logger';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const encodeUrl = require('encodeurl');


export async function httpClientActionProcessor(_data: unknown, context: ProcessorContext): Promise<boolean> {
  const { httpRegion, httpClient, request } = context;
  if (request) {
    await initBody(request);
    request.proxy = httpRegion.metaData.proxy;
    request.followRedirect = !httpRegion.metaData.noRedirect;
    try {
      const response = await httpClient(request, context);
      if (response) {
        httpRegion.response = response;
        return true;
      }
    } catch (err) {
      log.error(request.url, request);
      throw err;
    }
  }
  return false;
}

async function initBody(request: HttpRequest) {
  if (isString(request.body) || Array.isArray(request.body)) {
    request.body = await normalizeBody(request.body);
    if (request.body && isString(request.body) && isMimeTypeFormUrlEncoded(request.contentType)) {
      request.body = encodeUrl(request.body);
    }
  }
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
