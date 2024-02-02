import * as models from '../../../models';
import * as utils from '../../../utils';

export async function resolveRequestBody(request: models.Request, context: models.ProcessorContext): Promise<void> {
  if (request.body && Array.isArray(request.body)) {
    const buffers: Array<Buffer | string> = [];
    for (const obj of request.body) {
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
    request.body = buffers;
  }
}
