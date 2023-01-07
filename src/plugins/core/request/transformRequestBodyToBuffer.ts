import * as models from '../../../models';
import * as utils from '../../../utils';
import encodeUrl from 'encodeurl';

export async function transformRequestBodyToBuffer(
  request: models.Request,
  context: models.ProcessorContext
): Promise<void> {
  if (request.body) {
    if (utils.isString(request.body)) {
      if (utils.isMimeTypeFormUrlEncoded(request.contentType)) {
        request.body = encodeUrl(request.body);
      }
    } else if (
      Array.isArray(request.body) &&
      request.body.every(obj => ['function', 'string'].indexOf(typeof obj) >= 0)
    ) {
      request.body = await normalizeBody(request.body, context);
    }
  }
}

async function normalizeBody(
  body: Array<models.HttpRequestBodyLine>,
  context: models.ProcessorContext
): Promise<Buffer> {
  const buffers: Array<Buffer> = [];
  for (const obj of body) {
    if (utils.isString(obj)) {
      buffers.push(Buffer.from(obj));
    } else {
      const result = await obj(context);
      if (result) {
        if (utils.isString(result)) {
          buffers.push(Buffer.from(result));
        } else {
          buffers.push(result);
        }
      }
    }
  }
  return Buffer.concat(buffers);
}
