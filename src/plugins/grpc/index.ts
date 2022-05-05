import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { parseGrpcLine } from './grpcHttpRegionParser';
import { parseGrpcResponse } from './grpcResponseHttpRegionParser';
import { parseProtoImport } from './protoHttpRegionParser';
import * as grpc from '@grpc/grpc-js';

export function registerGrpcPlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('proto', parseProtoImport, { before: ['request'] });
  api.hooks.parse.addHook('grpc', parseGrpcLine, { before: ['request'] });
  api.hooks.parse.addHook('grpcResponse', parseGrpcResponse, { before: ['grpc'] });
  javascriptProvider.require['@grpc/grpc-js'] = grpc;
}
