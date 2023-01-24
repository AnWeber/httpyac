import * as models from '../../models';
import * as utils from '../../utils';
import * as amqpMethods from './amqpMethods';
import * as constants from './amqpMethods/amqpConstants';
import { isAmqpRequest } from './amqpRequest';
import { AMQPClient, AMQPChannel } from '@cloudamqp/amqp-client';

export class AmqpRequestClient extends models.AbstractRequestClient<AMQPClient> {
  constructor(private readonly request: models.Request, private readonly context: models.ProcessorContext) {
    super();
  }
  get reportMessage(): string {
    return `perform AMQP Request (${this.request.url})`;
  }

  private get channelId() {
    return utils.getHeaderNumber(this.request.headers, constants.AmqpChannelId);
  }

  private _channel: AMQPChannel | undefined;
  public get channel(): AMQPChannel | undefined {
    return this._channel;
  }

  private _nativeClient: AMQPClient | undefined;
  get nativeClient(): AMQPClient {
    if (!this._nativeClient) {
      if (isAmqpRequest(this.request)) {
        this._nativeClient = new AMQPClient(this.request.url || '');
      } else {
        throw new Error('no valid Request received');
      }
    }
    return this._nativeClient;
  }

  async connect(): Promise<models.HttpResponse | undefined> {
    if (isAmqpRequest(this.request)) {
      const client = this.nativeClient;
      await client.connect();
      this._channel = await client.channel(this.channelId);
    }
    return undefined;
  }

  async send(body?: string | Buffer): Promise<models.HttpResponse | undefined> {
    if (isAmqpRequest(this.request) && this.channel) {
      const context: amqpMethods.AmqpMethodContext = {
        body: body || this.request.body,
        channel: this.channel,
        request: this.request,
        context: this.context,
        onMessage: (type, msg) => this.onMessage(type, msg),
      };
      try {
        if (!body) {
          const method = this.getMethod(constants.getAmqpMethod(this.request));
          return await method.exchange(context);
        }
        return await this.getMethod().exchange(context);
      } catch (err) {
        return amqpMethods.errorToHttpResponse(err);
      }
    }
    return undefined;
  }

  override close(reason: models.RequestClientCloseReason): void {
    if (reason === models.RequestClientCloseReason.ERROR) {
      this.removeAllListeners();
      this._channel?.close();
      this._nativeClient?.close(`error`);
    } else if (reason === models.RequestClientCloseReason.CANCELLATION) {
      this.removeAllListeners();
      this._channel?.close();
      this._nativeClient?.close(`cancellation`);
    } else if (reason === models.RequestClientCloseReason.SUCCESS) {
      this.removeAllListeners();
      this._channel?.close();
      this._nativeClient?.close(`finished`);
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
