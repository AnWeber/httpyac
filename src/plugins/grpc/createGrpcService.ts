import * as grpc from '@grpc/grpc-js';

import { log } from '../../io';
import { ProtoDefinition } from '../../models';
export interface ServiceData {
  server: string;
  path: string;
  service: string;
  method: string;
  protocol: string;
  ServiceClass: {
    new (address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ChannelOptions>): GrpcClient;
  };
  methodDefinition: grpc.MethodDefinition<unknown, unknown>;
}

export interface GrpcClient extends grpc.Client {
  close(): void;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  [key: string]: Function;
}

export const GrpcUrlRegex =
  /^\s*((?<protocol>grpc|https?):\/\/)?(?<server>[^/]+?)(\/(?<path>.+))?\/(?<service>[^/]+?)\/(?<method>[^/]+?)$/iu;

export function getSerivceData(url: string, protoDefinitions: Record<string, ProtoDefinition>): ServiceData {
  const urlMatch = GrpcUrlRegex.exec(url);
  if (urlMatch && urlMatch.groups?.service) {
    const { server, path, service, method, protocol } = urlMatch.groups;
    const flatServices = flattenProtoDefinitions(protoDefinitions);

    let ServiceClass = flatServices[service];
    if (!ServiceClass) {
      const serviceKey = Object.keys(flatServices).find(key => key.indexOf(service) >= 0);
      if (serviceKey) {
        log.warn(`service ${service} not found. Similar service ${serviceKey} is used.`);
        ServiceClass = flatServices[serviceKey];
      }
    }
    if (typeof ServiceClass === 'function') {
      const methodDefinition =
        ServiceClass.service[method] ||
        Object.entries(ServiceClass.service)
          .filter(([key]) => key.toLowerCase() === method.toLowerCase())
          .map(([, value]) => value)
          .pop();
      return {
        server,
        service,
        path,
        protocol,
        method,
        ServiceClass,
        methodDefinition,
      };
    }

    const flatServiceKeys = Object.keys(flatServices);
    if (flatServiceKeys.length > 0) {
      throw new Error(`Service ${service} does not exist. Available Services: ${flatServiceKeys.join(', ')}`);
    } else {
      throw new Error(`Service ${service} does not exist. No Service imported`);
    }
  } else {
    throw new Error(`Url ${url} does not match pattern <server>/<service>/<method>`);
  }
}

function flattenProtoDefinitions(protoDefinitions: Record<string, ProtoDefinition>) {
  const result: grpc.GrpcObject = {};
  for (const protoDefinition of Object.values(protoDefinitions)) {
    if (protoDefinition.grpcObject) {
      const grpcObject = getFlatGrpcObject(protoDefinition.grpcObject);
      Object.assign(result, grpcObject);
    }
  }
  return result;
}

function getFlatGrpcObject(grpcObject: grpc.GrpcObject) {
  return Object.entries(grpcObject).reduce((prev, curr) => {
    if (typeof curr[1] === 'function') {
      prev[curr[0]] = curr[1];
    } else if (isGrpcObject(curr[1])) {
      for (const [name, value] of Object.entries(getFlatGrpcObject(curr[1]))) {
        prev[`${curr[0]}.${name}`] = value;
      }
    }
    return prev;
  }, {} as grpc.GrpcObject);
}
function isGrpcObject(obj: unknown): obj is grpc.GrpcObject {
  const grpcObject = obj as grpc.GrpcObject;
  return grpcObject && !grpcObject.format && typeof obj !== 'function';
}
