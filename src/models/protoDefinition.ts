import { GrpcObject } from '@grpc/grpc-js';
import { PackageDefinition } from '@grpc/proto-loader';

import { ProcessorContext } from './processorContext';

export class ProtoDefinition {
  loaderOptions?: Record<string, string>;

  constructor(readonly fileName: string) {}
  packageDefinition?: PackageDefinition;
  grpcObject?: GrpcObject;
}

export interface ProtoProcessorContext extends ProcessorContext {
  options: {
    protoDefinitions?: Record<string, ProtoDefinition>;
  };
}
