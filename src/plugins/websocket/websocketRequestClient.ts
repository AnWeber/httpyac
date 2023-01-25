import * as models from '../../models';
import * as utils from '../../utils';
import { isWebsocketRequest, WebsocketRequest } from './websocketRequest';
import { IncomingMessage } from 'http';
import WebSocket, { ClientOptions } from 'ws';

const WEBSOCKET_CLOSE_NORMAL = 1000;
const WEBSOCKET_CLOSE_GOING_AWAY = 1001;

export class WebsocketRequestClient extends models.AbstractRequestClient<WebSocket | undefined> {
  private _nativeClient: WebSocket | undefined;
  private responseTemplate: Partial<models.HttpResponse> & { protocol: string } = {
    protocol: 'WS',
  };

  constructor(private readonly request: models.Request, private readonly context: models.ProcessorContext) {
    super();
  }
  get reportMessage(): string {
    return `perform WebSocket Request (${this.request.url})`;
  }

  get nativeClient(): WebSocket | undefined {
    return this._nativeClient;
  }

  async connect(): Promise<void> {
    if (isWebsocketRequest(this.request)) {
      const nativeClient = new WebSocket(this.request.url || '', this.getClientOptions(this.request));
      this._nativeClient = this.nativeClient;
      this.registerEvents(nativeClient);
      await new Promise<void>(resolve => {
        nativeClient.on('open', () => {
          resolve();
        });
      });
    }
  }

  async send(body?: string | Buffer): Promise<void> {
    if (isWebsocketRequest(this.request)) {
      const sendBody = body || this.request.body;
      if (sendBody) {
        this.nativeClient?.send(sendBody);
      }
    }
  }

  override close(err?: Error): void {
    if (err) {
      this._nativeClient?.close(WEBSOCKET_CLOSE_GOING_AWAY, err.message);
    } else {
      this._nativeClient?.close(WEBSOCKET_CLOSE_NORMAL, 'CLOSE_NORMAL');
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
