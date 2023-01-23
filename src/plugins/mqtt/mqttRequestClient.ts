import { log } from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import { isMQTTRequest, MQTTRequest } from './mqttRequest';
import { connect, IClientOptions, QoS, MqttClient } from 'mqtt';

export class MQTTRequestClient extends models.AbstractRequestClient<MqttClient> {
  private client: MqttClient | undefined;
  private responseTemplate: Partial<models.HttpResponse> & { protocol: string } = {
    protocol: 'MQTT',
  };

  constructor(private readonly request: models.Request, private readonly context: models.ProcessorContext) {
    super();
  }
  get reportMessage(): string {
    return `perform MQTT Request (${this.request.url})`;
  }

  get nativeClient(): MqttClient {
    if (!this.client) {
      const options: IClientOptions = {};
      if (isMQTTRequest(this.request)) {
        Object.assign(options, this.getClientOptions(this.request, this.context));
      }
      this.client = connect(this.request.url || '', options);
      this.registerEvents(this.client);
    }

    return this.client;
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

  async connect(): Promise<models.HttpResponse | undefined> {
    const client = this.nativeClient;
    if (isMQTTRequest(this.request)) {
      this.subscribe(client, this.subscribeTopics, this.request);
    }
    return undefined;
  }

  async send(body?: string | Buffer): Promise<models.HttpResponse | undefined> {
    if (isMQTTRequest(this.request)) {
      const request = body ? { ...this.request, body: utils.toString(body) } : this.request;
      this.publish(this.nativeClient, this.publishTopics, request);
    }
    return undefined;
  }

  override close(): void {
    this.removeAllListeners();
    this.nativeClient.end(true, undefined, err => err && log.error('error on close', err));
  }

  private registerEvents(client: MqttClient) {
    client.on('message', (topic, message, packet) => {
      this.onMessage(topic, {
        ...this.responseTemplate,
        statusCode: 0,
        name: `MQTT ${topic} (${this.request.url})`,
        message: message.toString('utf-8'),
        body: {
          topic,
          message: message.toString('utf-8'),
          date: new Date(),
        },
        headers: {
          ...packet.properties,
        },
        rawBody: message,
      });
    });
    client.on('error', err => {
      this.onMessage('error', {
        ...this.responseTemplate,
        statusCode: 1,
        body: utils.toString(err),
      });
    });

    const metaDataEvents = [
      'connect',
      'reconnect',
      'packetsend',
      'packetreceive',
      'disconnect',
      'close',
      'offline',
      'end',
    ];
    for (const event of metaDataEvents) {
      if (utils.isString(event)) {
        client.on(event, (packet: unknown) => {
          this.onMetaData(event, {
            ...this.responseTemplate,
            statusCode: 0,
            message: packet ? `${event}: ${utils.toString(packet)}` : event,
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
      if (config.request.timeout !== undefined) {
        configOptions.connectTimeout = utils.toNumber(config.request.timeout);
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
  private publish(client: MqttClient, topics: string[], request: MQTTRequest) {
    if (request.body) {
      for (const topic of topics) {
        client.publish(
          topic,
          request.body,
          {
            qos: this.toQoS(utils.getHeaderString(request.headers, 'qos')),
            retain: !!utils.getHeader(request.headers, 'retain'),
          },
          err => err && log.error('publish error', err)
        );
      }
    }
  }

  private toQoS(qos: string | undefined): QoS {
    switch (qos) {
      case '2':
        return 2;
      case '1':
        return 1;
      default:
        return 0;
    }
  }
}
