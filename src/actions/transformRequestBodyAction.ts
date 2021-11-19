import * as models from '../models';
import * as utils from '../utils';
import encodeUrl from 'encodeurl';

export async function transformRequestBody(request: models.Request): Promise<models.Request> {
  if (request.body) {
    if (utils.isString(request.body)) {
      if (utils.isMimeTypeFormUrlEncoded(request.contentType)) {
        request.body = encodeUrl(request.body);
      }
    } else if (
      Array.isArray(request.body) &&
      request.body.some(obj => typeof obj === 'function') &&
      request.body.every(obj => ['function', 'string'].indexOf(typeof obj) >= 0)
    ) {
      request.body = await normalizeBody(request.body);
    }
  }
  return request;
}

async function normalizeBody(body: Array<models.HttpRequestBodyLine>): Promise<Buffer> {
  const buffers: Array<Buffer> = [];
  for (const obj of body) {
    if (utils.isString(obj)) {
      buffers.push(Buffer.from(obj));
    } else {
      buffers.push(await obj());
    }
  }
  return Buffer.concat(buffers);
}
