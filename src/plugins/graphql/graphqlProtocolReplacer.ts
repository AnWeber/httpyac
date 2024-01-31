import * as models from '../../models';
import { getHeader } from '../../utils';

export async function graphqlProtocolReplacer(request: models.Request): Promise<void> {
  if (request.method?.toUpperCase() === 'GRAPHQL') {
    request.method = 'POST';
    if (!getHeader(request.headers, 'content-type')) {
      if (!request.headers) {
        request.headers = {};
      }
      request.headers['content-type'] = 'application/json';
    }
  }
}
