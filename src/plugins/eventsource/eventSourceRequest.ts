import { Request } from '../../models';

export interface EventSourceRequest extends Request<'SSE'> {
  headers?: Record<string, string>;
}

export function isEventSourceRequest(request: Request | undefined): request is EventSourceRequest {
  return request?.protocol === 'SSE';
}
