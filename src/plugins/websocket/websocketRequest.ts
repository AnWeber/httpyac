import { Request } from '../../models';
import { ClientOptions } from 'ws';

export interface WebsocketRequest extends Request<'WS'> {
  options?: ClientOptions;
  headers?: Record<string, string>;
}

export function isWebsocketRequest(request: Request | undefined): request is WebsocketRequest {
  return request?.protocol === 'WS';
}
