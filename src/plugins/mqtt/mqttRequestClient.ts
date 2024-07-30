import { connectAsync, IClientOptions, MqttClient, MqttClientEventCallbacks } from 'mqtt';

import { log } from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import { isMQTTRequest, MQTTRequest } from './mqttRequest';

type QoS = 0 | 1 | 2;

export class MQTTRequestClient extends models.AbstractRequestClient<MqttClient | undefined> {
  private responseTemplate: Partial<models.HttpResponse> & { protocol: string } = {
    protocol: 'MQTT',
  };
  private promises: Array<Promise<void>> = [];

  constructor(
    private readonly request: models.Request,
    private readonly context: models.ProcessorContext
  ) {
    super();
  }
  get reportMessage(): string {
    return `perform MQTT Request (${this.request.url})`;
  }

  get supportsStreaming() {
    return true;
  }

  private _nativeClient: MqttClient | undefined;
  get nativeClient(): MqttClient | undefined {
    return this._nativeClient;
  }

  private get publishTopics() {
    if (isMQTTRequest(this.request)) {
      return [
        ...utils.getHeaderArray(this.request.headers, 'topic'),
        ...utils.getHeaderArray(this.request.headers, 'publish'),
      ];
    }
    return [];
  }

  private get subscribeTopics() {
    if (isMQTTRequest(this.request)) {
      return [
        ...utils.getHeaderArray(this.request.headers, 'topic'),
        ...utils.getHeaderArray(this.request.headers, 'subscribe'),
      ];
    }
    return [];
  }

  async connect(): Promise<MqttClient | undefined> {
    if (isMQTTRequest(this.request)) {
      const request = this.request;
      const options: IClientOptions = {};
      if (isMQTTRequest(this.request)) {
        Object.assign(options, this.getClientOptions(this.request, this.context));
      }

      this._nativeClient = await connectAsync(this.request.url || '', options);
      this.registerEvents(this._nativeClient);
      this.subscribe(this._nativeClient, this.subscribeTopics, request);
    }
    return this._nativeClient;
  }

  async send(body?: unknown): Promise<void> {
    if (isMQTTRequest(this.request) && this.nativeClient) {
      const request = { ...this.request, body: utils.toString(body || this.request.body) };
      const promise = this.publish(this.nativeClient, this.publishTopics, request);
      this.promises.push(promise);
      await promise;
      const index = this.promises.findIndex(obj => obj === promise);
      if (index >= 0) {
        this.promises.splice(index, 1);
      }
    }
  }

  disconnect(err?: Error): void {
    const close = () => {
      this.nativeClient?.end(!!err, undefined, err => err && log.error('error on close', err));
      this.onDisconnect();
    };
    if (this.promises.length > 0) {
      Promise.all([...this.promises]).then(close);
    } else {
      close();
    }
  }

  private registerEvents(client: MqttClient) {
    client.on('message', (topic, message, packet) => {
      this.onMessage(topic, {
        ...this.responseTemplate,
        statusCode: 0,
        name: `MQTT ${topic} (${this.request.url})`,
        message: message.toString('utf-8'),
        request: this.request,
        body: message.toString('utf-8'),
        rawBody: message,
        headers: {
          topic,
          ...packet.properties,
        },
      });
    });
    client.on('error', err => {
      this.onMessage('error', {
        ...this.responseTemplate,
        statusCode: 1,
        request: this.request,
        body: utils.errorToString(err),
      });
    });

    const metaDataEvents: Array<keyof MqttClientEventCallbacks> = [
      'close',
      'connect',
      'disconnect',
      'end',
      'offline',
      'outgoingEmpty',
      'packetreceive',
      'packetsend',
      'reconnect',
    ];
    for (const event of metaDataEvents) {
      if (utils.isString(event)) {
        client.on(event, (packet: unknown) => {
          this.onMetaData(event, {
            ...this.responseTemplate,
            statusCode: 0,
            message: packet ? `${utils.toString(packet)}` : undefined,
            body: {
              event,
              packet,
              date: new Date(),
            },
          });
        });
      }
    }
  }

  private getClientOptions(request: MQTTRequest, context: models.ProcessorContext): IClientOptions {
    const { config } = context;

    const configOptions: IClientOptions = {};
    if (config?.request) {
      const timeout = request.timeout || utils.toNumber(config.request.timeout);
      if (timeout !== undefined) {
        configOptions.connectTimeout = timeout;
      }
      if (!utils.isUndefined(config.request.rejectUnauthorized)) {
        configOptions.rejectUnauthorized = utils.toBoolean(config.request.rejectUnauthorized, true);
      }
    }
    if (request.noRejectUnauthorized) {
      configOptions.rejectUnauthorized = false;
    }

    const headers = Object.fromEntries(
      Object.entries(request.headers || {}).filter(
        ([key]) => ['topic', 'qos', 'retain', 'subscribe', 'publish'].indexOf(key.toLowerCase()) < 0
      )
    );

    return Object.assign({}, config?.request, request.options, configOptions, headers);
  }

  private subscribe(client: MqttClient, topics: string[], request: MQTTRequest) {
    for (const topic of topics) {
      client.subscribe(topic, {
        qos: this.toQoS(utils.getHeaderString(request.headers, 'qos')),
      });
    }
  }
  private async publish(client: MqttClient, topics: string[], request: MQTTRequest) {
    if (request.body) {
      const body = request.body;
      const header = {
        qos: this.toQoS(utils.getHeaderString(request.headers, 'qos')),
        retain: !!utils.getHeader(request.headers, 'retain'),
      };
      await Promise.all(
        topics.map(async topic => {
          try {
            await client.publishAsync(topic, body, header);
          } catch (err) {
            log.error('publish error', err);
          }
        })
      );
    }
  }
  private toQoS(qos: string | undefined, defaultVal: QoS = 0): QoS {
    switch (qos) {
      case '2':
        return 2;
      case '1':
        return 1;
      default:
        return defaultVal;
    }
  }
}
