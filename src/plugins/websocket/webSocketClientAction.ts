import * as io from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import { isWebsocketRequest, WebsocketRequest } from './websocketRequest';
import WebSocket, { ClientOptions } from 'ws';

const WEBSOCKET_CLOSE_NORMAL = 1000;
const WEBSOCKET_CLOSE_GOING_AWAY = 1001;
export class WebSocketClientAction {
  id = 'websocket';

  async process(context: models.ProcessorContext): Promise<boolean> {
    const { request } = context;
    if (isWebsocketRequest(request)) {
      return await utils.triggerRequestResponseHooks(async () => {
        if (request.url) {
          utils.report(context, `request websocket ${request.url}`);
          return await this.requestWebsocket(request, context);
        }
        return false;
      }, context);
    }
    return false;
  }

  private async requestWebsocket(
    request: WebsocketRequest,
    context: models.ProcessorContext
  ): Promise<models.HttpResponse> {
    const startTime = new Date().getTime();

    return await new Promise<models.HttpResponse>((resolve, reject) => {
      if (!request.url) {
        reject(new Error('request url undefined'));
        return;
      }
      const options: ClientOptions = this.getClientOptions(request, context);

      const responseTemplate: Partial<models.HttpResponse> = {
        request,
      };
      const mergedData: Array<unknown> = [];
      const loadingPromises: Array<Promise<unknown>> = [];

      const getResponseTemplate: () => Partial<models.HttpResponse> = () => {
        responseTemplate.timings = {
          total: new Date().getTime() - startTime,
        };
        return responseTemplate;
      };

      const client = new WebSocket(request.url, options);
      const webSocketVariables = { websocketClient: client };
      let disposeCancellation: models.Dispose | undefined;
      if (context.progress) {
        disposeCancellation = context.progress?.register?.(() => {
          client.close(WEBSOCKET_CLOSE_GOING_AWAY, 'CLOSE_GOING_AWAY');
        });
      }

      client.on('open', () => {
        io.log.debug('WebSocket open');
        if (request.body) {
          client.send(request.body, err => (context.scriptConsole || io.log).error(err));
        }
        utils.setVariableInContext(webSocketVariables, context);
        context.variables.websocketClient = client;
        const onStreaming = context.httpFile.hooks.onStreaming.merge(context.httpRegion.hooks.onStreaming);
        onStreaming
          .trigger(context)
          .then(() => client.close(WEBSOCKET_CLOSE_NORMAL, 'CLOSE_NORMAL'))
          .catch(err => reject(err));
      });
      client.on('upgrade', message => {
        io.log.debug('WebSocket upgrade', message);
        responseTemplate.headers = message.headers;
        responseTemplate.statusCode = message.statusCode;
        responseTemplate.statusMessage = message.statusMessage;
        responseTemplate.httpVersion = message.httpVersion;
      });

      const handleResponseFactory = (type: string) => (data: Buffer | WebSocket.RawData) => {
        const body = utils.toString(data);
        io.log.debug(`WebSocket ${type}`, body);
        mergedData.push({ type, body });
        if (!context.httpRegion.metaData.noStreamingLog) {
          if (context.logStream) {
            loadingPromises.push(
              context.logStream(type, {
                protocol: 'WS',
                name: `WS ${type} (${request.url})`,
                statusCode: 0,
                headers: {
                  type,
                },
                request,
                body,
              })
            );
          }
        }
      };

      client.on('ping', handleResponseFactory('ping'));
      client.on('pong', handleResponseFactory('pong'));
      client.on('message', handleResponseFactory('message'));
      client.on('error', err => {
        io.log.debug('WebSocket error', err);
        mergedData.push(err);
      });

      client.on('close', async (code, reason) => {
        io.log.debug('WebSocket close', code, reason);
        if (disposeCancellation) {
          disposeCancellation();
        }
        utils.unsetVariableInContext(webSocketVariables, context);
        await Promise.all(loadingPromises);
        resolve(this.toMergedHttpResponse(code, reason, mergedData, getResponseTemplate()));
      });
    });
  }

  private getClientOptions(request: WebsocketRequest, context: models.ProcessorContext): ClientOptions {
    const { httpRegion, config } = context;

    const configOptions: Record<string, unknown> = {};
    if (config?.request) {
      configOptions.handshakeTimeout = utils.toNumber(config.request.timeout);
      if (!utils.isUndefined(config.request.rejectUnauthorized)) {
        configOptions.rejectUnauthorized = utils.toBoolean(config.request.rejectUnauthorized, true);
      }
      if (!utils.isUndefined(config.request.followRedirects)) {
        configOptions.followRedirects = utils.toBoolean(config.request.followRedirects, true);
      }
    }

    const metaDataOptions: Record<string, unknown> = {
      headers: request.headers,
    };
    if (httpRegion.metaData.noRedirect) {
      metaDataOptions.followRedirects = !httpRegion.metaData.noRedirect;
    }
    if (httpRegion.metaData.noRejectUnauthorized) {
      metaDataOptions.rejectUnauthorized = false;
    }
    return Object.assign({}, config?.request, request.options, metaDataOptions);
  }

  private toMergedHttpResponse(
    code: number,
    reason: Buffer | string,
    data: Array<unknown>,
    responseTemplate: Partial<models.HttpResponse>
  ): models.HttpResponse {
    const response = this.toHttpResponse(data, responseTemplate);
    response.statusCode = code;
    response.statusMessage = Buffer.isBuffer(reason) ? reason.toString('utf-8') : reason;
    return response;
  }

  private toHttpResponse(
    data: string | Array<unknown>,
    responseTemplate: Partial<models.HttpResponse>
  ): models.HttpResponse {
    const body = utils.isString(data) ? data : utils.stringifySafe(data, 2);
    const rawBody: Buffer = Buffer.from(body);
    const response: models.HttpResponse = {
      headers: {},
      statusCode: 0,
      ...responseTemplate,
      protocol: 'WS',
      body,
      prettyPrintBody: body,
      parsedBody: data,
      rawBody,
      contentType: {
        mimeType: 'application/json',
        charset: 'UTF-8',
        contentType: 'application/json; charset=utf-8',
      },
    };
    if (this.isWebsocketError(data)) {
      response.statusCode = -1;
      response.statusMessage = data.code;
    }
    return response;
  }

  private isWebsocketError(data: unknown): data is Error & { code: string } {
    return data instanceof Error;
  }
}
