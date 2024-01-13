import './completionItemProvider';

import * as grpc from '@grpc/grpc-js';

import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { callOptionsRequestHook } from './callOptionsRequestHook';
import { channelCredentialsRequestHook } from './channelCredentialsRequestHook';
import { channelOptionsRequestHook } from './channelOptionsRequestHook';
import { parseGrpcLine } from './grpcHttpRegionParser';
import { parseGrpcResponse } from './grpcResponseHttpRegionParser';
import { parseProtoImport } from './protoHttpRegionParser';
import { grpcReflectionMetaDataHandler } from './grpcReflectionMetaDataHandler';
import { grpcReflectionRequestHook } from './grpcReflectionRequestHook';

export function registerGrpcPlugin(api: models.HttpyacHooksApi) {
  api.hooks.parseMetaData.addHook('grpcReflection', grpcReflectionMetaDataHandler);
  api.hooks.parse.addHook('proto', parseProtoImport, { before: ['request'] });
  api.hooks.parse.addHook('grpc', parseGrpcLine, { before: ['request'] });
  api.hooks.parse.addHook('grpcResponse', parseGrpcResponse, { before: ['requestBody'] });
  api.hooks.onRequest.addHook('channelOptions', channelOptionsRequestHook);
  api.hooks.onRequest.addHook('channelCredentials', channelCredentialsRequestHook);
  api.hooks.onRequest.addHook('callOptions', callOptionsRequestHook);
  api.hooks.onRequest.addHook('grpcReflectionRequestHook', grpcReflectionRequestHook);
  javascriptProvider.require['@grpc/grpc-js'] = grpc;
}
