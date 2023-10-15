import * as utils from '../../utils';
import { GrpcRequestClient } from './grpcRequestClient';
import { userSessionStore } from '../../store';

export const parseGrpcLine = utils.parseRequestLineFactory({
  protocol: 'GRPC',
  methodRegex: /^\s*(GRPC)\s+(?<url>.+?)\s*$/u,
  protocolRegex: /^\s*(?<url>grpc:\/\/.+?)\s*$/iu,
  requestClientFactory(request, context) {
    return new GrpcRequestClient(request, context);
  },
  modifyRequest(request) {
    request.supportsStreaming = true;
  },
  sessionStore: userSessionStore,
});
