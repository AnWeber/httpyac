import * as utils from '../../utils';
import { GrpcRequestClient } from './grpcRequestClient';

export const parseGrpcLine = utils.parseRequestLineFactory({
  protocol: 'GRPC',
  methodRegex: /^\s*(grpc)\s*(?<url>.+?)\s*$/iu,
  protocolRegex: /^\s*grpc:\/\/(?<url>.+?)\s*$/iu,
  requestClientFactory(request, context) {
    return new GrpcRequestClient(request, context);
  },
  modifyRequest(request) {
    request.supportsStreaming = true;
  },
});
