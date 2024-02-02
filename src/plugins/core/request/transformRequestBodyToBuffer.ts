import * as models from '../../../models';
import * as utils from '../../../utils';

export async function transformRequestBodyToBuffer(
  request: models.Request,
  context: models.ProcessorContext
): Promise<void> {
  if (request.body) {
    request.body = await transformToBufferOrString(request.body, context);
  }
}

export async function transformToBufferOrString(
  body: models.RequestBody,
  context: models.ProcessorContext
): Promise<string | Buffer> {
  if (utils.isString(body)) {
    return body;
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  return await normalizeBody(body, context);
}

export async function normalizeBody(
  body: Array<models.HttpRequestBodyLine>,
  context: models.ProcessorContext
): Promise<Buffer | string> {
  const buffers: Array<Buffer | string> = [];
  for (const obj of body) {
    if (utils.isString(obj)) {
      buffers.push(obj);
    } else if (Buffer.isBuffer(obj)) {
      buffers.push(obj);
    } else {
      const result = await obj(context);
      if (result) {
        buffers.push(result);
      }
    }
  }
  if (buffers.some(obj => Buffer.isBuffer(obj))) {
    return Buffer.concat(buffers.map(obj => (Buffer.isBuffer(obj) ? obj : Buffer.from(obj))));
  }
  return buffers.join('');
}
