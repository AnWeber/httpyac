import { AMQPChannel, AMQPClient } from '@cloudamqp/amqp-client';

import * as models from '../../models';
import * as utils from '../../utils';
import * as amqpMethods from './amqpMethods';
import * as constants from './amqpMethods/amqpConstants';
import { AmqpRequest, isAmqpRequest } from './amqpRequest';

export class AmqpRequestClient extends models.AbstractRequestClient<AMQPClient | undefined> {
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

  public getSessionId() {
    return utils.replaceInvalidChars(this.request.url);
  }

  private _channel: AMQPChannel | undefined;
  public get channel(): AMQPChannel | undefined {
    return this._channel;
  }

  private _nativeClient: AMQPClient | undefined;
  get nativeClient(): AMQPClient | undefined {
    return this._nativeClient;
  }

  async connect(obj: AMQPClient | undefined): Promise<AMQPClient | undefined> {
    if (isAmqpRequest(this.request)) {
      if (obj) {
        this._nativeClient = obj;
      } else {
        this._nativeClient = new AMQPClient(this.request.url || '');
        await this._nativeClient.connect();
      }
      const channelId = utils.getHeaderNumber(this.request.headers, constants.AmqpChannelId);
      this._channel = await this._nativeClient.channel(channelId);
      await this.executeAmqpMethod(this.request);
      return this._nativeClient;
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
    if (err) {
      this.channel?.close();
      this._nativeClient?.close(err.message);
    } else {
      this._channel?.close();
      this._nativeClient?.close();
    }
    this.onDisconnect();
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
