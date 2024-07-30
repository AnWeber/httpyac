import { log } from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import { isGrpcRequest } from './grpcRequest';
import { GrpcUrlRegex } from './createGrpcService';
import { loadGrpcProtoDefinitionsWithReflection } from './grpcReflectionMetaDataHandler';

export async function grpcReflectionRequestHook(request: models.Request, context: models.ProtoProcessorContext) {
  if (isGrpcRequest(request)) {
    utils.report(context, 'grpc reflection');

    const host = GrpcUrlRegex.exec(request.url)?.groups?.server;
    if (!host) {
      return;
    }
    if (context.options.protoDefinitions && Object.keys(context.options.protoDefinitions).length > 0) {
      return;
    }
    try {
      const protoDefinitions = await loadGrpcProtoDefinitionsWithReflection(host, request);

      if (Object.keys(protoDefinitions).length === 0) {
        return;
      }
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
