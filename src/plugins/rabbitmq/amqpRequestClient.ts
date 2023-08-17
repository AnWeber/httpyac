import * as models from '../../models';
import * as store from '../../store';
import * as utils from '../../utils';
import * as amqpMethods from './amqpMethods';
import * as constants from './amqpMethods/amqpConstants';
import { AmqpRequest, isAmqpRequest } from './amqpRequest';
import { AMQPClient, AMQPChannel } from '@cloudamqp/amqp-client';

interface AmqpSession {
  client: AMQPClient;
  channel: AMQPChannel;
}

export class AmqpRequestClient extends models.AbstractRequestClient<AMQPClient | undefined> {
  private closeClientOnFinish = true;
  constructor(
    private readonly request: models.Request,
    private readonly context: models.ProcessorContext
  ) {
    super();
  }
  get reportMessage(): string {
    return `perform AMQP Request (${this.request.url})`;
  }

  get supportsStreaming() {
    return true;
  }

  private _channel: AMQPChannel | undefined;
  public get channel(): AMQPChannel | undefined {
    return this._channel;
  }

  private _nativeClient: AMQPClient | undefined;
  get nativeClient(): AMQPClient | undefined {
    return this._nativeClient;
  }

  private async initAMQPClient(request: AmqpRequest): Promise<void> {
    const channelId = utils.getHeaderNumber(request.headers, constants.AmqpChannelId);
    if (channelId) {
      const userSession: (models.UserSession & Partial<AmqpSession>) | undefined =
        store.userSessionStore.getUserSession(this.getAmqpSessionId(request, channelId));
      if (userSession && userSession.client && userSession.channel) {
        this._nativeClient = userSession.client;
        this._channel = userSession.channel;
        this.closeClientOnFinish = false;
        return;
      }
    }

    this._nativeClient = new AMQPClient(request.url || '');
    await this._nativeClient.connect();
    this._channel = await this._nativeClient.channel(channelId);

    this.setUserSession(request, this._nativeClient, this._channel);
  }

  private getAmqpSessionId(request: AmqpRequest, channelId: number) {
    return `amqp_${request.url}_${channelId}`;
  }
  private setUserSession(request: AmqpRequest, client: AMQPClient, channel: AMQPChannel) {
    const session: models.UserSession & AmqpSession = {
      id: this.getAmqpSessionId(request, channel.id),
      description: `${request.url} and channel ${channel.id}`,
      details: {
        url: request.url,
      },
      title: `AMQP Client for ${request.url}`,
      type: 'AMQP',
      client,
      channel,
      delete: async () => {
        this.disconnect();
      },
    };
    store.userSessionStore.setUserSession(session);
  }

  async connect(): Promise<void> {
    if (isAmqpRequest(this.request)) {
      await this.initAMQPClient(this.request);
      await this.executeAmqpMethod(this.request);
    }
    return undefined;
  }

  async send(body?: unknown): Promise<void> {
    if (isAmqpRequest(this.request) && this.channel && body) {
      await this.executeAmqpMethod({
        ...this.request,
        body: utils.toBufferLike(body),
      });
    }
  }

  private async executeAmqpMethod(request: AmqpRequest) {
    if (this.channel) {
      const context: amqpMethods.AmqpMethodContext = {
        channel: this.channel,
        request,
        context: this.context,
        onMessage: (type, msg) => this.onMessage(type, msg),
      };
      try {
        const method = this.getMethod(constants.getAmqpMethod(request));
        return await method.exchange(context);
      } catch (err) {
        return amqpMethods.errorToHttpResponse(err, request);
      }
    }
    return undefined;
  }

  override disconnect(err?: Error): void {
    if (this.closeClientOnFinish) {
      if (isAmqpRequest(this.request) && this._channel?.id) {
        store.userSessionStore.removeUserSession(this.getAmqpSessionId(this.request, this._channel.id));
      }
      if (err) {
        this.channel?.close();
        this._nativeClient?.close(err.message);
      } else {
        this._channel?.close();
        this._nativeClient?.close();
      }
      this.onDisconnect();
    }
  }

  private getMethod(methodName = 'publish') {
    const result: Record<string, (context: amqpMethods.AmqpMethodContext) => Promise<models.HttpResponse | undefined>> =
      {
        ack: amqpMethods.ack,
        bind: amqpMethods.bind,
        cancel: amqpMethods.cancel,
        consume: amqpMethods.consume,
        declare: amqpMethods.declare,
        delete: amqpMethods.deleteMessage,
        nack: amqpMethods.nack,
        publish: amqpMethods.publish,
        purge: amqpMethods.purge,
        subscribe: amqpMethods.consume,
        unbind: amqpMethods.unbind,
      };
    if (methodName) {
      return {
        method: methodName,
        exchange: result[methodName],
      };
    }

    throw new Error(
      `Amqp Method ${methodName} not supported (supported: ${Object.entries(amqpMethods)
        .map(([key]) => key)
        .join(', ')})`
    );
  }
}
