import * as models from '../models';
import { log } from '../io';
import * as utils from '../utils';
import { ParserRegex, ProtoProcessorContext } from '../parser';
import * as grpc from '@grpc/grpc-js';
import get from 'lodash/get';
import { Readable, Writable, Duplex } from 'stream';

grpc.setLogger(log);

export class GrpcClientAction implements models.HttpRegionAction {
  id = models.ActionType.grpcClient;


  async process(context: ProtoProcessorContext): Promise<boolean> {
    const { request } = context;
    const protoDefinitions = context.options.protoDefinitions;
    if (utils.isGrpcRequest(request) && request?.url && protoDefinitions) {
      return await utils.triggerRequestResponseHooks(async () => {
        if (request.url) {
          const serviceData = this.getService(request.url, protoDefinitions);
          if (serviceData.ServiceClass) {

            const client = (new serviceData.ServiceClass(serviceData.server, this.getChannelCredentials(request)));
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

  private async requestGrpc(method: (...args: unknown[]) => (Readable | Writable | Duplex),
    methodDefinition: grpc.MethodDefinition<unknown, unknown>,
    request: models.GrpcRequest,
    context: models.ProcessorContext): Promise<models.HttpResponse> {
    const data = this.getData(request);
    const metaData = this.getMetaData(request);

    const startTime = new Date().getTime();

    return await new Promise<models.HttpResponse>((resolve, reject) => {
      const args: Array<unknown> = [
        metaData,
      ];

      let disposeCancellation: models.Dispose | undefined;
      let responseMetaData: Record<string, unknown> = {};
      const grpcActions: Array<(stream: GrpcStream) => void> = [
        stream => stream.on('metadata', (metaData: grpc.Metadata) => {
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

      const getResponseTemplate: (() => Partial<models.HttpResponse>) = () => ({
        headers: responseMetaData,
        request,
        timings: {
          total: new Date().getTime() - startTime,
        }
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
        grpcActions.push(...this.getResponseStreamActions(streamResolve, getResponseTemplate, context));
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
        if (data && stream instanceof Writable || stream instanceof Duplex) {
          stream.write(data);
        }
      },
      stream => {
        if (stream instanceof Writable || stream instanceof Duplex) {
          context.variables.grpcStream = stream;
          context.httpRegion.hooks.onStreaming.trigger(context)
            .then(() => stream.end())
            .catch(err => reject(err))
            .finally(() => {
              delete context.variables.grpcStream;
            });
        }
      }
    ];
  }

  private getResponseStreamActions(
    resolve: (value: models.HttpResponse) => void,
    getResponseTemplate: () => Partial<models.HttpResponse>,
    context: models.ProcessorContext
  ): Array<GrpcStreamAction> {
    const loadingPromises: Array<Promise<unknown>> = [];
    const mergedData: Array<unknown> = [];
    let isResolved = false;
    const resolveStream = async () => {
      if (!isResolved) {
        isResolved = true;
        await Promise.all(loadingPromises);
        const response = this.toMergedHttpResponse(mergedData, getResponseTemplate());
        resolve(response);
      }
    };
    return [
      stream => stream.on('data', chunk => {
        mergedData.push(chunk);
        if (!context.httpRegion.metaData.noStreamingLog) {
          loadingPromises.push(utils.logResponse(this.toHttpResponse(chunk, getResponseTemplate()), context));
        }
      }),
      stream => stream.on('error', err => mergedData.push(err)),
      stream => stream.on('end', resolveStream),
      stream => stream.on('close', resolveStream),
    ];
  }

  private getData(request: models.Request): unknown {
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
      const channelCredentials = utils.getHeader(request.headers, 'channelcredentials') || utils.getHeader(request.headers, 'authorization');
      if (channelCredentials instanceof grpc.ChannelCredentials) {
        return channelCredentials;
      }
    }
    return grpc.credentials.createInsecure();
  }

  private getMetaData(request: models.GrpcRequest): grpc.Metadata {
    const metaData = new grpc.Metadata();
    const specialKeys = ['authorization', 'channelcredentials'];
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
      const protoDefinition = Object.values(protoDefinitions).find(obj => get(obj.grpcObject, service));
      const ServiceClass = get(protoDefinition?.grpcObject, service);
      if (typeof ServiceClass === 'function') {

        const methodDefinition = ServiceClass.service[method] || Object.entries(ServiceClass.service)
          .filter(([key]) => key.toLowerCase() === method.toLowerCase())
          .map(([, value]) => value)
          .pop();

        return {
          server,
          service,
          method,
          ServiceClass,
          methodDefinition
        };
      }
      throw new Error(`Service ${service} does not exist`);
    } else {
      throw new Error(`Url ${url} does not match pattern <server>/<service>/<method>`);
    }
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
        contentType: 'application/grpc+json; charset=utf-8'
      },
    };
    if (this.isGrpcError(data)) {
      response.statusCode = data.code || -1;
      response.statusMessage = data.details;
    }
    return response;
  }

  private toMergedHttpResponse(data: Array<unknown>, responseTemplate: Partial<models.HttpResponse>): models.HttpResponse {
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


interface GrpcError {
  details?: string;
  code?: number;
  message?: string;
}

export type GrpcStream = Readable | Writable | Duplex;

export interface GrpcSession extends models.UserSession {
  stream: Writable | Duplex;
}

export type GrpcStreamAction = (stream: GrpcStream) => void;
