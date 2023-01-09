import * as models from '../../../models';
import * as utils from '../../../utils';

export async function transformRequestBodyToBuffer(
  request: models.Request,
  context: models.ProcessorContext
): Promise<void> {
  if (request.body) {
    if (Array.isArray(request.body) && request.body.every(obj => ['function', 'string'].indexOf(typeof obj) >= 0)) {
      request.body = await normalizeBody(request.body, context);
    }
  }
}

async function normalizeBody(
  body: Array<models.HttpRequestBodyLine>,
  context: models.ProcessorContext
): Promise<Buffer | string> {
  const buffers: Array<Buffer | string> = [];
  for (const obj of body) {
    if (utils.isString(obj)) {
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
