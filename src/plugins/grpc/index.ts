import * as models from '../../models';
import { parseGrpcLine } from './grpcHttpRegionParser';
import { parseProtoImport } from './protoHttpRegionParser';

export function registerGrpcPlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('proto', parseProtoImport, { before: ['request'] });
  api.hooks.parse.addHook('grpc', parseGrpcLine, { before: ['request'] });
}
