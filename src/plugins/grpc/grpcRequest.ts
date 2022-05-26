import { Request } from '../../models';
import type { ChannelOptions, ChannelCredentials } from '@grpc/grpc-js';

export interface GrpcRequest extends Request<'GRPC'> {
  headers?: Record<string, string | Buffer | ChannelCredentials>;
  options?: ChannelOptions;
}

export function isGrpcRequest(request: Request | undefined): request is GrpcRequest {
  return request?.protocol === 'GRPC';
}
