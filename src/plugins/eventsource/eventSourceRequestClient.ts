import EventSource from 'eventsource';

import { log } from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import { EventSourceRequest, isEventSourceRequest } from './eventSourceRequest';

export class EventSourceRequestClient extends models.AbstractRequestClient<EventSource | undefined> {
  private responseTemplate: Partial<models.HttpResponse> & { protocol: string } = {
    protocol: 'SSE',
  };

  constructor(private readonly request: models.Request) {
    super();
  }
  get reportMessage(): string {
    return `perform SSE Request (${this.request.url})`;
  }

  get supportsStreaming() {
    return true;
  }

  private _nativeClient: EventSource | undefined;
  get nativeClient(): EventSource | undefined {
    return this._nativeClient;
  }

  async connect(): Promise<EventSource | undefined> {
    if (isEventSourceRequest(this.request)) {
      this._nativeClient = new EventSource(this.request.url || '', this.getClientOptions(this.request));
      this.registerEvents(this._nativeClient, this.request);
    }
    return this._nativeClient;
  }

  async send(): Promise<void> {
    log.debug('SSE does not support send');
  }

  override disconnect(): void {
    this.nativeClient?.close();
    this.onDisconnect();
  }

  private getClientOptions(request: EventSourceRequest): EventSource.EventSourceInitDict {
    const options: EventSource.EventSourceInitDict = {};
    const headers = { ...request.headers };
    utils.deleteHeader(headers, 'event');
    options.headers = headers;

    if (request.noRejectUnauthorized) {
      options.rejectUnauthorized = false;
    }
    if (request.proxy) {
      options.proxy = request.proxy;
    }
    return options;
  }

  private registerEvents(client: EventSource, request: EventSourceRequest) {
    const events = utils.getHeaderArray(request.headers, 'event', ['data', 'message']);

    for (const event of events) {
      client.addEventListener(event, message => {
        this.onMessage('message', {
          ...this.responseTemplate,
          statusCode: message.status || 200,
          name: `EventSource (${this.request.url})`,
          request: this.request,
          body: message.data,
          rawBody: Buffer.from(message.data),
        });
      });
    }
    client.onerror = err => {
      this.onMessage('error', {
        ...this.responseTemplate,
        statusCode: 400,
        request: this.request,
        body: utils.errorToString(err),
      });
    };

    const metaDataEvents = ['open'];
    for (const event of metaDataEvents) {
      client.addEventListener(event, message => {
        this.onMetaData('open', {
          ...this.responseTemplate,
          statusCode: 200,
          message: message.data,
          body: {
            data: message.data,
            date: new Date(),
          },
        });
      });
    }
  }
}
