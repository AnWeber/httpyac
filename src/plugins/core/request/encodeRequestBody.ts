import encodeUrl from 'encodeurl';

import * as models from '../../../models';
import * as utils from '../../../utils';

export async function encodeRequestBody(request: models.Request): Promise<void> {
  if (request.body) {
    if (utils.isString(request.body)) {
      if (utils.isMimeTypeFormUrlEncoded(request.contentType)) {
        request.body = encodeUrl(request.body);
      }
    }
  }
}
