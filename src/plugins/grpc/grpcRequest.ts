import { Request } from '../../models';
import type { ChannelOptions } from '@grpc/grpc-js';

export interface GrpcRequest extends Request<'GRPC'> {
  headers?: Record<string, unknown>;
  options?: ChannelOptions;
}

export function isGrpcRequest(request: Request | undefined): request is GrpcRequest {
  return request?.method === 'GRPC';
}
