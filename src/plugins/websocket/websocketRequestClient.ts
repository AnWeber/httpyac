import * as models from '../../models';
import * as store from '../../store';
import * as utils from '../../utils';
import { isWebsocketRequest, WebsocketRequest } from './websocketRequest';
import { IncomingMessage } from 'http';
import WebSocket, { ClientOptions } from 'ws';

const WEBSOCKET_CLOSE_NORMAL = 1000;
const WEBSOCKET_CLOSE_GOING_AWAY = 1001;

interface WebsocketSession extends models.UserSession {
  client: WebSocket;
}

export class WebsocketRequestClient extends models.AbstractRequestClient<WebSocket | undefined> {
  private closeOnFinish = true;
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

  get supportsStreaming() {
    return true;
  }

  get nativeClient(): WebSocket | undefined {
    return this._nativeClient;
  }

  async connect(): Promise<void> {
    if (isWebsocketRequest(this.request)) {
      this._nativeClient = this.initWebsocket(this.request);
      if (this.closeOnFinish) {
        this.registerEvents(this._nativeClient);
        await new Promise<void>(resolve => {
          this._nativeClient?.on('open', () => {
            resolve();
          });
        });
      }
    }
  }

  private initWebsocket(request: WebsocketRequest) {
    const session: (models.UserSession & Partial<WebsocketSession>) | undefined = store.userSessionStore.getUserSession(
      this.getWebsocketId(request)
    );
    if (session?.client) {
      this.closeOnFinish = false;
      return session.client;
    }
    const nativeClient = new WebSocket(this.request.url || '', this.getClientOptions(request));
    this.setUserSession(request, nativeClient);
    return nativeClient;
  }

  async send(body?: unknown): Promise<void> {
    if (isWebsocketRequest(this.request)) {
      const sendBody = utils.toBufferLike(body || this.request.body);
      if (sendBody) {
        this.nativeClient?.send(sendBody, err => {
          if (err) {
            this.onMessage('error', {
              ...this.responseTemplate,
              statusCode: 400,
              body: utils.toString(err),
            });
          }
        });
      }
    }
  }

  override disconnect(err?: Error): void {
    if (this.closeOnFinish) {
      this.removeWebsocketSession();
      this.closeWebsocket(err);
    }
  }

  private closeWebsocket(err?: Error) {
    if (err) {
      this._nativeClient?.close(WEBSOCKET_CLOSE_GOING_AWAY, err.message);
    } else {
      this._nativeClient?.close(WEBSOCKET_CLOSE_NORMAL, 'CLOSE_NORMAL');
    }
    this.onDisconnect();
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
        statusCode: 0,
        name: `${client.protocol} (${this.request.url})`,
        message: utils.toString(message),
        headers: {
          date: new Date(),
        },
        body: utils.toString(message),
        rawBody: Buffer.isBuffer(message) ? message : undefined,
      });
    });
    client.on('close', (statusCode, reason) => {
      this.onMessage('message', {
        ...this.responseTemplate,
        statusCode,
        name: `${client.protocol} (${this.request.url})`,
        message: utils.toString(reason),
        headers: {
          date: new Date(),
        },
        body: utils.toString(reason),
        rawBody: Buffer.isBuffer(reason) ? reason : undefined,
      });
      this.removeWebsocketSession();
    });

    const metaDataEvents = ['upgrade', 'unexpected-response', 'ping', 'pong', 'closing', 'close'];
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

    const configOptions: ClientOptions = {};
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

  private getWebsocketId(request: WebsocketRequest) {
    return `ws_${request.url}`;
  }
  private setUserSession(request: WebsocketRequest, client: WebSocket) {
    const session: models.UserSession & WebsocketSession = {
      id: this.getWebsocketId(request),
      description: `Client for ${request.url}`,
      details: {
        url: request.url,
      },
      title: `WS Client for ${request.url}`,
      type: 'WS',
      client,
      delete: async () => {
        this.closeWebsocket();
      },
    };
    store.userSessionStore.setUserSession(session);
  }
  private removeWebsocketSession() {
    if (isWebsocketRequest(this.request)) {
      store.userSessionStore.removeUserSession(this.getWebsocketId(this.request));
    }
  }
}
