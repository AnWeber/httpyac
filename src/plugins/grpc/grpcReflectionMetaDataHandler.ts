import { log } from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import * as grpc from '@grpc/grpc-js';
import { Client } from 'grpc-reflection-js';
import { fromJSON } from '@grpc/proto-loader';
import { loadPackageDefinition } from '@grpc/grpc-js';
import { GrpcRequest, isGrpcRequest } from './grpcRequest';
import { GrpcUrlRegex } from './createGrpcService';

export function grpcReflectionMetaDataHandler(type: string, server: string | undefined, context: models.ParserContext) {
  if (type === 'grpcReflection') {
    context.httpRegion.hooks.onRequest.addHook(
      'grpcReflection',
      async (request: models.Request, context: models.ProtoProcessorContext) => {
        if (!isGrpcRequest(request)) {
          return;
        }
        utils.report(context, 'grpc reflection');

        const host = server || GrpcUrlRegex.exec(request.url)?.groups?.server;
        if (host) {
          try {
            await loadAllServices(host, request, context);
          } catch (err) {
            log.warn('error in grpc reflection', err);
          }
        }
      }
    );
    return true;
  }
  return false;
}
async function loadAllServices(host: string, request: GrpcRequest, context: models.ProtoProcessorContext) {
  const reflectionClient = new Client(host, request.channelCredentials || grpc.credentials.createInsecure());

  const serviceNames = await reflectionClient.listServices();
  log.debug('grpc reflection', serviceNames);

  if (!context.options.protoDefinitions) {
    context.options.protoDefinitions = {};
  }
  for (const serviceName of serviceNames) {
    if (!serviceName.startsWith('grpc.reflection')) {
      const symbol = await reflectionClient.fileContainingSymbol(serviceName);
      const packageDefinition = fromJSON(symbol);
      const grpcObject = loadPackageDefinition(packageDefinition);

      context.options.protoDefinitions[serviceName] = {
        fileName: serviceName,
        loaderOptions: {},
        grpcObject,
        packageDefinition,
      };
    }
  }
}
