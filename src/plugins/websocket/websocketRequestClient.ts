import * as models from '../../models';
import * as utils from '../../utils';
import { isWebsocketRequest, WebsocketRequest } from './websocketRequest';
import { IncomingMessage } from 'http';
import WebSocket, { ClientOptions } from 'ws';

const WEBSOCKET_CLOSE_NORMAL = 1000;
const WEBSOCKET_CLOSE_GOING_AWAY = 1001;

export class WebsocketRequestClient extends models.AbstractRequestClient<WebSocket> {
  private client: WebSocket | undefined;
  private responseTemplate: Partial<models.HttpResponse> & { protocol: string } = {
    protocol: 'WS',
  };

  constructor(private readonly request: models.Request, private readonly context: models.ProcessorContext) {
    super();
  }
  get reportMessage(): string {
    return `perform WebSocket Request (${this.request.url})`;
  }

  get nativeClient(): WebSocket {
    if (!this.client) {
      if (isWebsocketRequest(this.request)) {
        this.client = new WebSocket(this.request.url || '', this.getClientOptions(this.request));
        this.registerEvents(this.client);
      } else {
        throw new Error('no valid Request received');
      }
    }
    return this.client;
  }

  async connect(): Promise<models.HttpResponse | undefined> {
    if (isWebsocketRequest(this.request)) {
      const client = this.nativeClient;

      return await new Promise(resolve => {
        client.on('open', () => {
          resolve(undefined);
        });
      });
    }
    return undefined;
  }

  async send(body: string | Buffer): Promise<models.HttpResponse | undefined> {
    if (isWebsocketRequest(this.request)) {
      this.nativeClient?.send(body);
    }
    return undefined;
  }

  override close(reason: models.RequestClientCloseReason): void {
    this.removeAllListeners();
    if (reason === models.RequestClientCloseReason.ERROR) {
      this.client?.close(WEBSOCKET_CLOSE_GOING_AWAY, 'WEBSOCKET_CLOSE_GOING_AWAY');
    } else {
      this.client?.close(WEBSOCKET_CLOSE_NORMAL, 'CLOSE_NORMAL');
    }
  }

  private registerEvents(client: WebSocket) {
    client.on('error', err => {
      this.onMessage('error', {
        ...this.responseTemplate,
        statusCode: 400,
        body: utils.toString(err),
      });
    });
    client.on('message', message => {
      this.onMessage('message', {
        ...this.responseTemplate,
        statusCode: 200,
        name: `WS (${this.request.url})`,
        message: utils.toString(message),
        body: {
          message: utils.toString(message),
          date: new Date(),
        },
      });
    });

    const metaDataEvents = ['upgrade', 'unexpected-response', 'ping', 'pong', 'close'];
    for (const event of metaDataEvents) {
      if (utils.isString(event)) {
        client.on(event, (message: IncomingMessage) => {
          this.onMetaData(event, {
            ...this.responseTemplate,
            statusCode: message?.statusCode || 0,
            statusMessage: message?.statusMessage,
            headers: message?.headers,
            httpVersion: message?.httpVersion,
            message: message ? `${event}: ${utils.toString(message)}` : event,
            body: {
              event,
              message,
              date: new Date(),
            },
          });
        });
      }
    }
  }

  private getClientOptions(request: WebsocketRequest): ClientOptions {
    const { config } = this.context;

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
    if (request.noRedirect) {
      metaDataOptions.followRedirects = false;
    }
    if (request.noRejectUnauthorized) {
      metaDataOptions.rejectUnauthorized = false;
    }
    return Object.assign({}, config?.request, request.options, metaDataOptions);
  }
}
