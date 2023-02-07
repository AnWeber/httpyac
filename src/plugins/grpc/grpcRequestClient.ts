import { log } from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import { getSerivceData, ServiceData } from './createGrpcService';
import { GrpcRequest, isGrpcRequest } from './grpcRequest';
import { PathAwareChannel } from './pathAwareChannel';
import * as grpc from '@grpc/grpc-js';
import { Readable, Writable, Duplex } from 'stream';

grpc.setLogger(log);
type GrpcStream = Readable | Writable | Duplex;

interface GrpcError {
  details?: string;
  code?: number;
  message?: string;
}

export class GrpcRequestClient extends models.AbstractRequestClient<GrpcStream | undefined> {
  private serviceData: ServiceData | undefined;
  private responseTemplate: Partial<models.HttpResponse> & { protocol: string } = {
    protocol: 'GRPC',
  };

  constructor(private readonly request: models.Request, private readonly context: models.ProtoProcessorContext) {
    super();
  }
  get reportMessage(): string {
    return `perform gRPC Request (${this.request.url})`;
  }

  get supportsStreaming() {
    return !!this.serviceData?.methodDefinition?.requestStream || !!this.serviceData?.methodDefinition?.responseStream;
  }

  private _nativeClient: GrpcStream | undefined;
  get nativeClient(): GrpcStream | undefined {
    return this._nativeClient;
  }

  private getChannelOptions(request: GrpcRequest, serviceData: ServiceData) {
    const options: grpc.ChannelOptions = {};
    if (serviceData.path) {
      options.channelFactoryOverride = (
        address: string,
        credentials: grpc.ChannelCredentials,
        options: grpc.ChannelOptions
      ) => {
        try {
          const nextOptions = Object.assign({}, options);
          delete nextOptions.channelFactoryOverride;
          nextOptions['grpc.default_authority'] = serviceData.server;
          return new PathAwareChannel(address, credentials, nextOptions, serviceData.path);
        } catch (err) {
          log.debug(err);
        }
        return new grpc.Channel(address, credentials, options);
      };
    }
    return Object.assign(options, request.options);
  }

  async connect(): Promise<void> {
    if (isGrpcRequest(this.request)) {
      const protoDefinitions = this.context.options.protoDefinitions;
      if (isGrpcRequest(this.request) && protoDefinitions) {
        this.serviceData = getSerivceData(this.request.url || '', protoDefinitions);
      }
    }
    return undefined;
  }

  async send(body?: unknown): Promise<void> {
    let promise: Promise<void> | undefined;
    if (!this.nativeClient) {
      promise = new Promise<void>(resolve => {
        this.createNativeClient(resolve);
      });
    }
    if (isGrpcRequest(this.request) && (this.nativeClient instanceof Writable || this.nativeClient instanceof Duplex)) {
      this.nativeClient.write(this.getData(body || this.request.body));
    }
    return promise;
  }

  private createNativeClient(resolve: () => void) {
    if (this.serviceData?.ServiceClass && isGrpcRequest(this.request)) {
      const method = this.getServiceDataMethod(this.serviceData, this.request);
      const { methodArgs, needsResolve } = this.getMethodArgs(this.serviceData, this.request, () => resolve());
      this._nativeClient = method(...methodArgs);
      const methodName = this.serviceData.method;
      this.registerEvents(this._nativeClient, methodName);
      if (needsResolve) {
        resolve();
      }
    }
  }

  private getMethodArgs(serviceData: ServiceData, request: GrpcRequest, resolve: () => void) {
    let needsResolve = true;
    const methodArgs: Array<unknown> = [this.getMetaData(request)];
    if (request.callOptions) {
      methodArgs.push(request.callOptions);
    }
    if (!serviceData.methodDefinition?.requestStream) {
      methodArgs.splice(0, 0, this.getData(this.request.body));
    }
    if (!serviceData.methodDefinition?.responseStream) {
      needsResolve = false;
      methodArgs.push((err: Error, data: unknown) => {
        this.onMessage(serviceData.method, this.toHttpResponse(err || data));
        resolve();
      });
    }
    return { methodArgs, needsResolve };
  }

  private getServiceDataMethod(serviceData: ServiceData, request: GrpcRequest): (...args: unknown[]) => GrpcStream {
    const client = new serviceData.ServiceClass(
      serviceData.server,
      request.channelCredentials || grpc.credentials.createInsecure(),
      this.getChannelOptions(request, serviceData)
    );
    const method = client[serviceData.method]?.bind?.(client);
    return method;
  }

  override disconnect(err?: Error): void {
    if (err) {
      this.nativeClient?.destroy(err);
    } else {
      if (this.nativeClient instanceof Writable || this.nativeClient instanceof Duplex) {
        this.nativeClient.end();
      }
    }
    this.onDisconnect();
  }

  private registerEvents(stream: GrpcStream, methodName: string): void {
    stream.on('metadata', (metaData: grpc.Metadata) => {
      this.responseTemplate.headers = metaData.getMap();
    });
    stream.on('data', chunk => {
      this.onMessage(methodName, this.toHttpResponse(chunk));
    });
    stream.on('error', err => {
      this.onMessage(methodName, this.toHttpResponse(err));
    });

    const metaDataEvents = ['end', 'close', 'pause', 'resume'];
    for (const event of metaDataEvents) {
      stream.on(event, message => {
        this.onMetaData(methodName, {
          ...this.responseTemplate,
          statusCode: 0,
          message: `${event} received`,
          body: {
            message,
            date: new Date(),
          },
        });
      });
    }
  }

  private getMetaData(request: GrpcRequest): grpc.Metadata {
    const metaData = new grpc.Metadata();
    if (request.headers) {
      for (const [key, value] of Object.entries(request.headers)) {
        if (utils.isString(value) || Buffer.isBuffer(value)) {
          metaData.add(key, value);
        }
      }
    }
    return metaData;
  }
  private toHttpResponse(data: unknown): models.HttpResponse {
    const body = utils.isString(data) ? data : utils.stringifySafe(data, 2);
    const response: models.HttpResponse = {
      headers: {},
      ...this.responseTemplate,
      statusCode: 0,
      statusMessage: 'OK',
      body,
      rawBody: Buffer.isBuffer(data) ? data : Buffer.from(body),
      parsedBody: data,
      contentType: {
        mimeType: 'application/grpc+json',
        charset: 'UTF-8',
        contentType: 'application/grpc+json; charset=utf-8',
      },
    };
    if (this.isGrpcError(data)) {
      response.statusCode = data.code || 2;
      response.statusMessage = data.details;
    }
    return response;
  }

  private isGrpcError(data: unknown): data is Error & GrpcError {
    return data instanceof Error;
  }
}
