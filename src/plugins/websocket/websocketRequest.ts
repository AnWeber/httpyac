import { ClientOptions } from 'ws';

import { Request } from '../../models';
import { isString } from '../../utils';

export interface WebsocketRequest extends Request<'WS'> {
  options?: ClientOptions;
  body?: string | Buffer;
  headers?: Record<string, string>;
}

export function isWebsocketRequest(request: Request | undefined): request is WebsocketRequest {
  const hasValidBody = !request?.body || isString(request.body) || Buffer.isBuffer(request.body);
  return request?.protocol === 'WS' && hasValidBody;
}
