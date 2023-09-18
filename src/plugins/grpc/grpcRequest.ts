import type { CallOptions, ChannelCredentials, ChannelOptions } from '@grpc/grpc-js';

import { Request } from '../../models';

export interface GrpcRequest extends Request<'GRPC'> {
  headers?: Record<string, string | Buffer | ChannelCredentials>;
  options?: ChannelOptions;
  channelCredentials?: ChannelCredentials;
  callOptions?: CallOptions;
}

export function isGrpcRequest(request: Request | undefined): request is GrpcRequest {
  return request?.protocol === 'GRPC';
}
