import * as models from '../../../models';
import * as utils from '../../../utils';
import encodeUrl from 'encodeurl';

export async function encodeRequestBody(request: models.Request): Promise<void> {
  if (request.body) {
    if (utils.isString(request.body)) {
      if (utils.isMimeTypeFormUrlEncoded(request.contentType)) {
        request.body = encodeUrl(request.body);
      }
    }
  }
}
