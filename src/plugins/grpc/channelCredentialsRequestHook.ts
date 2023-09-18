import { ChannelCredentials } from '@grpc/grpc-js';
import { HookCancel } from 'hookpoint';

import * as models from '../../models';
import * as utils from '../../utils';
import { isGrpcRequest } from './grpcRequest';

export async function channelCredentialsRequestHook(request: models.Request): Promise<void | typeof HookCancel> {
  if (isGrpcRequest(request) && request.headers) {
    const channelCredentials = utils.getHeader(request.headers, 'channelcredentials');
    if (channelCredentials instanceof ChannelCredentials) {
      utils.deleteHeader(request.headers, 'channelcredentials');
      request.channelCredentials = channelCredentials;
    }
  }
  return undefined;
}
