import { log } from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import * as grpc from '@grpc/grpc-js';
import { GrpcReflection } from 'grpc-js-reflection-client';
import { loadPackageDefinition } from '@grpc/grpc-js';
import { GrpcRequest, isGrpcRequest } from './grpcRequest';

export function grpcReflectionMetaDataHandler(type: string, server: string | undefined, context: models.ParserContext) {
  if (type === 'grpcReflection' && server) {
    context.httpRegion.hooks.onRequest.addHook(
      'grpcReflection',
      async (request: models.Request, context: models.ProtoProcessorContext) => {
        if (!isGrpcRequest(request)) {
          return;
        }
        utils.report(context, 'grpc reflection');

        if (server) {
          try {
            const protoDefinitions = await loadGrpcProtoDefinitionsWithReflection(server, request);

            if (context.options.protoDefinitions) {
              Object.assign(context.options.protoDefinitions, protoDefinitions);
            } else {
              context.options.protoDefinitions = protoDefinitions;
            }
          } catch (err) {
            log.debug('error in grpc reflection', err);
          }
        }
      }
    );
    return true;
  }
  return false;
}
export async function loadGrpcProtoDefinitionsWithReflection(
  host: string,
  request: GrpcRequest
): Promise<Record<string, models.ProtoDefinition>> {
  const reflectionClient = new GrpcReflection(host, request.channelCredentials || grpc.credentials.createInsecure());

  const serviceNames = await reflectionClient.listServices();
  log.debug('grpc reflection', serviceNames);

  const protoDefinitions: Record<string, models.ProtoDefinition> = {};
  for (const serviceName of serviceNames) {
    if (!serviceName.startsWith('grpc.reflection')) {
      const descriptor = await reflectionClient.getDescriptorBySymbol(serviceName);

      const packageDefinition = descriptor.getPackageDefinition();

      const grpcObject = loadPackageDefinition(packageDefinition);

      protoDefinitions[serviceName] = {
        fileName: serviceName,
        loaderOptions: {},
        grpcObject,
        packageDefinition,
      };
    }
  }
  return protoDefinitions;
}
