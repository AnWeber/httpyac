import { ChannelCredentials, credentials } from '@grpc/grpc-js';

import * as models from '../../models';
import * as utils from '../../utils';
import { isGrpcRequest } from './grpcRequest';

export async function channelCredentialsRequestHook(request: models.Request): Promise<void> {
  if (isGrpcRequest(request) && request.headers) {
    const channelCredentials = utils.getHeader(request.headers, 'channelcredentials');
    if (utils.isString(channelCredentials)) {
      if (channelCredentials.toLowerCase() === 'ssl') {
        request.channelCredentials = credentials.createSsl();
      }
      if (channelCredentials.toLowerCase() === 'insecure') {
        request.channelCredentials = credentials.createInsecure();
      }
    }
    if (channelCredentials instanceof ChannelCredentials) {
      utils.deleteHeader(request.headers, 'channelcredentials');
      request.channelCredentials = channelCredentials;
    }
  }
  return undefined;
}
