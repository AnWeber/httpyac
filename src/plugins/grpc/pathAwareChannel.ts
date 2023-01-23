import * as grpc from '@grpc/grpc-js';

// Rewire Google's channel implementation to support URL path prefix.
export class PathAwareChannel extends grpc.Channel {
  constructor(
    address: string,
    credentials: grpc.ChannelCredentials,
    options: grpc.ChannelOptions,
    readonly path: string
  ) {
    super(address, credentials, options);
  }

  createCall(
    method: string,
    deadline: grpc.Deadline,
    host: string | null | undefined,
    parentCall: null,
    propagateFlags: number | null | undefined
  ) {
    if (this.path) {
      return super.createCall(`/${this.path}${method}`, deadline, host, parentCall, propagateFlags);
    }
    return super.createCall(method, deadline, host, parentCall, propagateFlags);
  }
}
