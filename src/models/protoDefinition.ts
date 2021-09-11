import { GrpcObject } from '@grpc/grpc-js';
import { PackageDefinition } from '@grpc/proto-loader';

export class ProtoDefinition {
  loaderOptions: Record<string, string>;

  constructor(readonly fileName: string) {
    this.loaderOptions = {};
  }
  packageDefinition?: PackageDefinition;
  grpcObject?: GrpcObject;
}
