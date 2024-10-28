import { IncomingMessage } from 'http';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import WebSocket, { ClientOptions } from 'ws';

import * as models from '../../models';
import * as utils from '../../utils';
import { isWebsocketRequest, WebsocketRequest } from './websocketRequest';

const WEBSOCKET_CLOSE_NORMAL = 1000;
const WEBSOCKET_CLOSE_GOING_AWAY = 1001;

export class WebsocketRequestClient extends models.AbstractRequestClient<WebSocket | undefined> {
  private _nativeClient: WebSocket | undefined;
  private responseTemplate: Partial<models.HttpResponse> & { protocol: string } = {
    protocol: 'WS',
  };

  constructor(
    private readonly request: models.Request,
    private readonly context: models.ProcessorContext
  ) {
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

  public getSessionId() {
    return utils.replaceInvalidChars(this.request.url);
  }

  async connect(obj: WebSocket | undefined): Promise<WebSocket | undefined> {
    if (obj) {
      this._nativeClient = obj;
      return obj;
    }
    if (isWebsocketRequest(this.request)) {
      this._nativeClient = new WebSocket(this.request.url || '', this.getClientOptions(this.request));
      this.registerEvents(this._nativeClient);
      await new Promise<void>(resolve => {
        const resolveListener = () => {
          resolve();
          this.nativeClient?.off('open', resolveListener);
          this.nativeClient?.off('close', resolveListener);
        };
        this._nativeClient?.on('open', resolveListener);
        this._nativeClient?.on('close', resolveListener);
      });
    }
    return this._nativeClient;
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
              request: this.request,
              body: utils.errorToString(err),
            });
          }
        });
      }
    }
  }

  override disconnect(err?: Error): void {
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
        request: this.request,
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
        request: this.request,
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
        request: this.request,
        body: utils.toString(reason) || 'close',
        rawBody: Buffer.isBuffer(reason) ? reason : undefined,
      });
    });

    const metaDataEvents = ['upgrade', 'ping', 'pong', 'closing', 'close'];
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
      configOptions.handshakeTimeout = request.timeout || utils.toNumber(config.request.timeout);
      configOptions.sessionTimeout = configOptions.handshakeTimeout;
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
    if (request.proxy) {
      this.initProxy(configOptions, request.proxy);
    }
    return Object.assign({}, config?.request, request.options, metaDataOptions);
  }

  private initProxy(options: ClientOptions, proxy: string | undefined) {
    if (proxy) {
      if (proxy.startsWith('socks://')) {
        const socksProxy = new SocksProxyAgent(proxy);
        options.agent = socksProxy;
      } else if (proxy.startsWith('http://')) {
        options.agent = new HttpProxyAgent(proxy);
      } else {
        options.agent = new HttpsProxyAgent(proxy);
      }
    }
  }
}
