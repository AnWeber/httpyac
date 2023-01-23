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
  private _nativeClient: GrpcStream | undefined;
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

  get nativeClient(): GrpcStream | undefined {
    return this._nativeClient;
  }

  private set nativeClient(client: GrpcStream | undefined) {
    this._nativeClient = client;
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

  async connect(): Promise<models.HttpResponse | undefined> {
    if (isGrpcRequest(this.request)) {
      return new Promise<undefined>(resolve => {
        const protoDefinitions = this.context.options.protoDefinitions;
        if (isGrpcRequest(this.request) && protoDefinitions) {
          this.serviceData = getSerivceData(this.request.url || '', protoDefinitions);
          if (this.serviceData.ServiceClass) {
            const method = this.getServiceDataMethod(this.serviceData, this.request);
            const { methodArgs, needsResolve } = this.getMethodArgs(this.serviceData, this.request, () =>
              resolve(undefined)
            );
            this.nativeClient = method(...methodArgs);
            const methodName = this.serviceData.method;
            this.registerEvents(this.nativeClient, methodName);
            if (needsResolve) {
              resolve(undefined);
            }
          }
        }
      });
    }
    return undefined;
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

  async send(body?: string | Buffer): Promise<models.HttpResponse | undefined> {
    return new Promise<undefined>(resolve => {
      if (
        isGrpcRequest(this.request) &&
        (this.nativeClient instanceof Writable || this.nativeClient instanceof Duplex)
      ) {
        this.nativeClient.write(this.getData(body || this.request.body));
        if (!body) {
          this.waitForStreamEnd(() => resolve(undefined));
        } else {
          resolve(undefined);
        }
      } else {
        this.waitForStreamEnd(() => resolve(undefined));
      }
    });
  }

  private waitForStreamEnd(resolve: () => void) {
    let isResolved = false;
    const streamResolve = () => {
      if (!isResolved) {
        isResolved = true;
        resolve();
      }
    };
    this.nativeClient?.on('end', streamResolve);
    this.nativeClient?.on('close', streamResolve);
  }

  override close(reason: models.RequestClientCloseReason): void {
    if (this.nativeClient) {
      if (reason === models.RequestClientCloseReason.ERROR) {
        this.nativeClient.destroy();
      } else if (reason === models.RequestClientCloseReason.CANCELLATION) {
        this.nativeClient.destroy(new Error('Cancellation'));
      } else if (reason === models.RequestClientCloseReason.SUCCESS) {
        if (this.nativeClient instanceof Writable || this.nativeClient instanceof Duplex) {
          this.nativeClient.end();
        }
        this.removeAllListeners();
      }
    }
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
  private getData(body: unknown): unknown {
    if (utils.isString(body)) {
      return JSON.parse(body);
    }
    if (Buffer.isBuffer(body)) {
      return JSON.parse(body.toString('utf-8'));
    }
    return body;
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
      rawBody: Buffer.from(body),
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
