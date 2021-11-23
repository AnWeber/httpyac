import { log } from '../io';
import * as models from '../models';
import { ParserRegex, ProtoProcessorContext } from '../parser';
import * as utils from '../utils';
import * as grpc from '@grpc/grpc-js';
import { Readable, Writable, Duplex } from 'stream';

interface GrpcError {
  details?: string;
  code?: number;
  message?: string;
}

type GrpcStream = Readable | Writable | Duplex;

type GrpcStreamAction = (stream: GrpcStream) => void;

export class GrpcClientAction implements models.HttpRegionAction {
  id = models.ActionType.grpcClient;

  async process(context: ProtoProcessorContext): Promise<boolean> {
    grpc.setLogger(log);
    const { request } = context;
    const protoDefinitions = context.options.protoDefinitions;
    if (utils.isGrpcRequest(request) && request?.url && protoDefinitions) {
      return await utils.triggerRequestResponseHooks(async () => {
        if (request.url) {
          utils.report(context, `reqeust gRPC ${request.url}`);
          const serviceData = this.getService(request.url, protoDefinitions);
          if (serviceData.ServiceClass) {
            const client = new serviceData.ServiceClass(serviceData.server, this.getChannelCredentials(request));
            const method = client[serviceData.method]?.bind?.(client);
            if (method) {
              return await this.requestGrpc(method, serviceData.methodDefinition, request, context);
            }
          }
        }
        return false;
      }, context);
    }
    return false;
  }

  private async requestGrpc(
    method: (...args: unknown[]) => Readable | Writable | Duplex,
    methodDefinition: grpc.MethodDefinition<unknown, unknown>,
    request: models.GrpcRequest,
    context: models.ProcessorContext
  ): Promise<models.HttpResponse> {
    const data = this.getData(request);
    const metaData = this.getMetaData(request);

    const startTime = new Date().getTime();
    return await new Promise<models.HttpResponse>((resolve, reject) => {
      const args: Array<unknown> = [metaData];

      let disposeCancellation: models.Dispose | undefined;
      let responseMetaData: Record<string, unknown> = {};
      const grpcActions: Array<(stream: GrpcStream) => void> = [
        stream =>
          stream.on('metadata', (metaData: grpc.Metadata) => {
            responseMetaData = metaData.getMap();
          }),
        stream => {
          if (context.progress) {
            disposeCancellation = context.progress.register(() => {
              stream.destroy(new Error('Cancellation'));
            });
          }
        },
      ];

      const getResponseTemplate: () => Partial<models.HttpResponse> = () => ({
        headers: responseMetaData,
        request,
        timings: {
          total: new Date().getTime() - startTime,
        },
      });

      const streamResolve = (response: models.HttpResponse) => {
        if (disposeCancellation) {
          disposeCancellation();
        }
        resolve(response);
      };

      if (methodDefinition?.requestStream) {
        grpcActions.push(...this.getRequestStreamActions(data, context, reject));
      } else {
        args.splice(0, 0, data);
      }

      if (methodDefinition?.responseStream) {
        grpcActions.push(
          ...this.getResponseStreamActions(methodDefinition.path, streamResolve, getResponseTemplate, context)
        );
      } else {
        args.push((err: Error, data: unknown) => {
          streamResolve(this.toHttpResponse(err || data, getResponseTemplate()));
        });
      }

      const grpcStream = method(...args);
      grpcActions.forEach(obj => obj(grpcStream));
    });
  }

  private getRequestStreamActions(
    data: unknown,
    context: models.ProcessorContext,
    reject: (reason?: unknown) => void
  ): Array<GrpcStreamAction> {
    return [
      stream => {
        if ((data && stream instanceof Writable) || stream instanceof Duplex) {
          stream.write(data);
        }
      },
      stream => {
        if (stream instanceof Writable || stream instanceof Duplex) {
          utils.setVariableInContext({ grpcStream: stream }, context);
          context.httpRegion.hooks.onStreaming
            .trigger(context)
            .then(() => stream.end())
            .catch(err => reject(err));
        }
      },
    ];
  }

  private getResponseStreamActions(
    methodName: string,
    resolve: (value: models.HttpResponse) => void,
    getResponseTemplate: () => Partial<models.HttpResponse>,
    context: models.ProcessorContext
  ): Array<GrpcStreamAction> {
    const loadingPromises: Array<Promise<unknown>> = [];
    const mergedData: Array<unknown> = [];
    let isResolved = false;
    const resolveStreamFactory = (type: string) => async () => {
      log.debug(`GRPC ${type}`);
      if (!isResolved) {
        isResolved = true;
        utils.unsetVariableInContext({ grpcStream: true }, context);
        await Promise.all(loadingPromises);
        const response = this.toMergedHttpResponse(mergedData, getResponseTemplate());
        resolve(response);
      }
    };
    return [
      stream =>
        stream.on('data', chunk => {
          log.debug('GRPC data', chunk);
          mergedData.push(chunk);
          if (!context.httpRegion.metaData.noStreamingLog) {
            if (context.logStream) {
              loadingPromises.push(context.logStream('gRPC', methodName, chunk));
            } else {
              loadingPromises.push(utils.logResponse(this.toHttpResponse(chunk, getResponseTemplate()), context));
            }
          }
        }),
      stream =>
        stream.on('error', err => {
          log.debug('GRPC error', err);
          mergedData.push(err);
        }),
      stream => stream.on('end', resolveStreamFactory('end')),
      stream => stream.on('close', resolveStreamFactory('close')),
    ];
  }

  private getData(request: models.GrpcRequest): unknown {
    if (utils.isString(request.body)) {
      return JSON.parse(request.body);
    }
    if (Buffer.isBuffer(request.body)) {
      return JSON.parse(request.body.toString('utf-8'));
    }
    return request.body;
  }

  private getChannelCredentials(request: models.GrpcRequest): grpc.ChannelCredentials {
    if (request.headers) {
      const channelCredentials = utils.getHeader(request.headers, 'channelcredentials');
      if (channelCredentials instanceof grpc.ChannelCredentials) {
        return channelCredentials;
      }
    }
    return grpc.credentials.createInsecure();
  }

  private getMetaData(request: models.GrpcRequest): grpc.Metadata {
    const metaData = new grpc.Metadata();
    const specialKeys = ['channelcredentials'];
    if (request.headers) {
      for (const [key, value] of Object.entries(request.headers)) {
        if (specialKeys.indexOf(key.toLowerCase()) < 0) {
          if (utils.isString(value) || Buffer.isBuffer(value)) {
            metaData.add(key, value);
          }
        }
      }
    }
    return metaData;
  }

  private getService(url: string, protoDefinitions: Record<string, models.ProtoDefinition>) {
    const urlMatch = ParserRegex.grpc.grpcUrl.exec(url);
    if (urlMatch && urlMatch.groups?.service) {
      const { server, service, method } = urlMatch.groups;
      const flatServices = this.flattenProtoDefintions(protoDefinitions);

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
          method,
          ServiceClass,
          methodDefinition,
        };
      }
      log.error(`Service ${service} does not exist. Available Services`, ...Object.keys(flatServices));
      throw new Error(`Service ${service} does not exist. Available Services: ${Object.keys(flatServices).join(', ')}`);
    } else {
      throw new Error(`Url ${url} does not match pattern <server>/<service>/<method>`);
    }
  }

  private flattenProtoDefintions(protoDefinitions: Record<string, models.ProtoDefinition>) {
    const result: grpc.GrpcObject = {};
    for (const protoDefinition of Object.values(protoDefinitions)) {
      if (protoDefinition.grpcObject) {
        const grpcObject = this.getFlatGrpcObject(protoDefinition.grpcObject);
        Object.assign(result, grpcObject);
      }
    }
    return result;
  }

  private getFlatGrpcObject(grpcObject: grpc.GrpcObject) {
    return Object.entries(grpcObject).reduce((prev, curr) => {
      if (typeof curr[1] === 'function') {
        prev[curr[0]] = curr[1];
      } else if (this.isGrpcObject(curr[1])) {
        for (const [name, value] of Object.entries(this.getFlatGrpcObject(curr[1]))) {
          prev[`${curr[0]}.${name}`] = value;
        }
      }
      return prev;
    }, {} as grpc.GrpcObject);
  }

  private isGrpcObject(obj: unknown): obj is grpc.GrpcObject {
    const grpcObject = obj as grpc.GrpcObject;
    return grpcObject && !grpcObject.format && typeof obj !== 'function';
  }

  private toHttpResponse(data: unknown, responseTemplate: Partial<models.HttpResponse>): models.HttpResponse {
    const json = JSON.stringify(data, null, 2);
    const response: models.HttpResponse = {
      headers: {},
      ...responseTemplate,
      statusCode: 0,
      statusMessage: 'OK',
      protocol: 'GRPC',
      body: json,
      prettyPrintBody: json,
      parsedBody: data,
      rawBody: Buffer.from(json),
      contentType: {
        mimeType: 'application/grpc+json',
        charset: 'UTF-8',
        contentType: 'application/grpc+json; charset=utf-8',
      },
    };
    if (this.isGrpcError(data)) {
      response.statusCode = data.code || -1;
      response.statusMessage = data.details;
    }
    return response;
  }

  private toMergedHttpResponse(
    data: Array<unknown>,
    responseTemplate: Partial<models.HttpResponse>
  ): models.HttpResponse {
    const response = this.toHttpResponse(data, responseTemplate);
    const error = data.find(obj => this.isGrpcError(obj));
    if (this.isGrpcError(error)) {
      response.statusCode = error.code || -1;
      response.statusMessage = error.details;
    }
    return response;
  }

  private isGrpcError(data: unknown): data is Error & GrpcError {
    return data instanceof Error;
  }
}
