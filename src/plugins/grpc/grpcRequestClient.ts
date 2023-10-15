import * as grpc from '@grpc/grpc-js';
import { Duplex, Readable, Writable } from 'stream';

import { log } from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import { getSerivceData, ServiceData } from './createGrpcService';
import { GrpcRequest, isGrpcRequest } from './grpcRequest';
import { PathAwareChannel } from './pathAwareChannel';

grpc.setLogger(log);
type GrpcStream = Readable | Writable | Duplex;

interface GrpcError {
  details?: string;
  code?: number;
  message?: string;
}

export class GrpcRequestClient extends models.AbstractRequestClient<ServiceData | undefined> {
  private grpcStream: GrpcStream | undefined;
  private responseTemplate: Partial<models.HttpResponse> & { protocol: string } = {
    protocol: 'GRPC',
  };

  constructor(
    private readonly request: models.Request,
    private readonly context: models.ProtoProcessorContext
  ) {
    super();
  }
  get reportMessage(): string {
    return `perform gRPC Request (${this.request.url})`;
  }

  get supportsStreaming() {
    return (
      !!this.nativeClient?.methodDefinition?.requestStream || !!this.nativeClient?.methodDefinition?.responseStream
    );
  }

  private _nativeClient: ServiceData | undefined;
  get nativeClient(): ServiceData | undefined {
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

  async connect(): Promise<ServiceData | undefined> {
    if (isGrpcRequest(this.request)) {
      const protoDefinitions = this.context.options.protoDefinitions;
      if (protoDefinitions) {
        this._nativeClient = getSerivceData(this.request.url || '', protoDefinitions);
      }
    }
    return this._nativeClient;
  }

  async send(body?: unknown): Promise<void> {
    return new Promise<void>(resolve => {
      const data = this.getData(body || this.request.body);

      const initNewStream = !this.grpcStream || !this._nativeClient?.methodDefinition.requestStream;

      if (initNewStream) {
        this.grpcStream = this.callMethod(data, resolve);

        if (this.grpcStream instanceof Duplex || this.grpcStream instanceof Readable) {
          this.grpcStream.once('end', () => resolve());
        }
      }
      if (isGrpcRequest(this.request) && (this.grpcStream instanceof Writable || this.grpcStream instanceof Duplex)) {
        this.grpcStream.write(data);
      }
      if (!initNewStream) {
        resolve();
      }
    });
  }

  private callMethod(body: unknown, resolve: () => void): GrpcStream | undefined {
    if (this.nativeClient?.ServiceClass && isGrpcRequest(this.request)) {
      const method = this.getServiceDataMethod(this.nativeClient, this.request);
      const methodArgs = this.getMethodArgs(this.nativeClient, this.request, body, resolve);
      const result = method(...methodArgs);
      const methodName = this.nativeClient.method;
      this.registerEvents(result, methodName);
      return result;
    }
    return undefined;
  }

  private getMethodArgs(serviceData: ServiceData, request: GrpcRequest, body: unknown, resolve: () => void) {
    const methodArgs: Array<unknown> = [this.getMetaData(request)];
    if (request.callOptions) {
      methodArgs.push(request.callOptions);
    }
    if (!serviceData.methodDefinition?.requestStream) {
      methodArgs.splice(0, 0, body);
    }
    if (!serviceData.methodDefinition?.responseStream) {
      methodArgs.push((err: Error, data: unknown) => {
        this.onMessage(serviceData.method, this.toHttpResponse(err || data));
        resolve();
      });
    }
    return methodArgs;
  }

  private getData(body: unknown): unknown {
    if (utils.isString(body)) {
      return JSON.parse(body);
    }
    if (Buffer.isBuffer(body)) {
      return JSON.parse(body.toString('utf-8'));
    }
    return body;
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

  public streamEnded(): void {
    if (this.grpcStream instanceof Writable || this.grpcStream instanceof Duplex) {
      this.grpcStream.end();
      delete this.grpcStream;
    }
  }

  override disconnect(err?: Error): void {
    if (err) {
      this.grpcStream?.destroy(err);
    } else {
      if (this.grpcStream instanceof Writable || this.grpcStream instanceof Duplex) {
        this.grpcStream.end();
      }
    }
    delete this.grpcStream;
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
      request: this.request,
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
