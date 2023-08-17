import * as io from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import * as kafkaMethods from './kafkaMethods';
import { isKafkaRequest, KafkaRequest } from './kafkaRequest';
import { Kafka } from 'kafkajs';

export class KafkaRequestClient extends models.AbstractRequestClient<Kafka | undefined> {
  constructor(
    private readonly request: models.Request,
    private readonly context: models.ProcessorContext
  ) {
    super();
  }
  private _nativeClient: Kafka | undefined;
  get nativeClient() {
    return this._nativeClient;
  }

  async connect(): Promise<void> {
    if (isKafkaRequest(this.request)) {
      this._nativeClient = new Kafka({
        ...this.request.options,
        clientId: utils.getHeaderString(this.request.headers, 'clientid') || 'httpyac',
        brokers: [...this.request.url.split(',').map(obj => obj.trim())],
      });
      await this.executeKafkaMethod(this.request);
    }
  }
  async send(body?: unknown): Promise<void> {
    if (isKafkaRequest(this.request) && this.nativeClient && body) {
      await this.executeKafkaMethod({
        ...this.request,
        body: utils.toBufferLike(body),
      });
    }
  }
  get reportMessage(): string {
    return `perform KAFKA Request (${this.request.url})`;
  }

  get supportsStreaming() {
    return true;
  }
  disconnect(err?: Error | undefined): void {
    io.log.error(err);
    this.onDisconnect();
  }

  private async executeKafkaMethod(request: KafkaRequest) {
    if (this.nativeClient) {
      const context: kafkaMethods.KafkaMethodContext = {
        kafka: this.nativeClient,
        request,
        context: this.context,
        onMessage: (type, msg) => this.onMessage(type, msg),
      };
      try {
        const method = this.getMethod(request.method);
        return await method.exchange(context);
      } catch (err) {
        return kafkaMethods.errorToHttpResponse(err, request);
      }
    }
    return undefined;
  }

  private getMethod(methodName = 'publish') {
    const result: Record<
      string,
      (context: kafkaMethods.KafkaMethodContext) => Promise<models.HttpResponse | undefined>
    > = {
      consume: kafkaMethods.consume,
    };
    if (methodName) {
      return {
        method: methodName,
        exchange: result[methodName],
      };
    }

    throw new Error(
      `Kafka Method ${methodName} not supported (supported: ${Object.entries(kafkaMethods)
        .map(([key]) => key)
        .join(', ')})`
    );
  }
}
