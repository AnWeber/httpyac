import * as models from '../../../models';
import * as utils from '../../../utils';

export async function setDefaultHttpyacHeaders(request: models.Request): Promise<void> {
  if (request) {
    const httpyacHeaders = {
      Accept: '*/*',
      'User-Agent': 'httpyac',
    };
    if (!request.headers) {
      request.headers = httpyacHeaders;
    } else {
      for (const [key, value] of Object.entries(httpyacHeaders)) {
        if (!utils.getHeader(request.headers, key)) {
          request.headers[key] = value;
        }
      }
    }
  }
}
