import * as io from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import { isMQTTRequest, MQTTRequest } from './mqttRequest';
import { connect, IClientOptions, QoS, MqttClient } from 'mqtt';

interface MQTTMessage {
  topic: string;
  message: string;
  date: Date;
}

export class MQTTClientAction {
  id = 'mqtt';

  async process(context: models.ProcessorContext): Promise<boolean> {
    const { request } = context;
    if (isMQTTRequest(request)) {
      return await utils.triggerRequestResponseHooks(async () => {
        if (request.url) {
          utils.report(context, `request MQTT ${request.url}`);

          return await this.requestMQTT(request, context);
        }
        return false;
      }, context);
    }
    return false;
  }

  private async requestMQTT(request: MQTTRequest, context: models.ProcessorContext): Promise<models.HttpResponse> {
    return await new Promise<models.HttpResponse>((resolve, reject) => {
      if (!request.url) {
        reject(new Error('request url undefined'));
        return;
      }

      const options: IClientOptions = this.getClientOptions(request, context);

      const responseTemplate: Partial<models.HttpResponse> = {
        request,
      };
      const mergedData: Array<MQTTMessage | Error> = [];
      const loadingPromises: Array<Promise<unknown>> = [];

      let disposeCancellation: models.Dispose | undefined;
      if (context.progress) {
        disposeCancellation = context.progress?.register?.(() => {
          client.end(true, undefined, err => err && io.log.error('error on close', err));
        });
      }

      const client = connect(request.url, options);
      const mqttVariables = { mqttClient: client };
      client.on('connect', packet => {
        io.log.debug('MQTT connect', packet);
        responseTemplate.protocol = 'MQTT';
        responseTemplate.headers = packet.properties;
      });
      client.on('reconnect', () => io.log.debug('MQTT reconnect'));
      client.on('message', (topic, message, packet) => {
        io.log.debug('MQTT message', message, packet);
        const data = {
          topic,
          message: message.toString('utf-8'),
          date: new Date(),
        };
        mergedData.push(data);
        if (!context.httpRegion.metaData.noStreamingLog) {
          if (context.logStream) {
            loadingPromises.push(
              context.logStream(topic, {
                ...responseTemplate,
                protocol: 'MQTT',
                name: `MQTT ${topic} (${request.url})`,
                statusCode: 0,
                body: data.message,
                headers: {
                  type: data.topic,
                  date: data.date,
                },
              })
            );
          }
        }
      });
      client.on('packetsend', packet => io.log.debug('MQTT packetsend', packet));
      client.on('packetreceive', packet => io.log.debug('MQTT packetreceive', packet));
      client.on('disconnect', packet => io.log.debug('MQTT disconnect', packet));
      client.on('close', () => io.log.debug('MQTT close'));
      client.on('offline', () => io.log.debug('MQTT offline'));
      client.on('error', err => {
        io.log.debug('MQTT error', err);
        mergedData.push(err);
      });
      client.on('end', async () => {
        io.log.debug('MQTT end');
        if (disposeCancellation) {
          disposeCancellation();
        }
        utils.unsetVariableInContext(mqttVariables, context);
        await Promise.all(loadingPromises);
        resolve(this.toMergedHttpResponse(mergedData, responseTemplate));
      });

      const topics = utils.getHeaderArray(request.headers, 'topic');
      const subscribeArray = [...topics, ...utils.getHeaderArray(request.headers, 'subscribe')];
      if (subscribeArray.length > 0) {
        this.subscribeToTopics(client, subscribeArray, this.toQoS(utils.getHeaderString(request.headers, 'qos')));
      }
      const publishArray = [...topics, ...utils.getHeaderArray(request.headers, 'publish')];
      if (publishArray) {
        this.publishToTopics(client, publishArray, request);
      }
      utils.setVariableInContext(mqttVariables, context);
      const onStreaming = context.httpFile.hooks.onStreaming.merge(context.httpRegion.hooks.onStreaming);
      onStreaming
        .trigger(context)
        .then(() => client.end())
        .catch(err => reject(err));
    });
  }

  private getClientOptions(request: MQTTRequest, context: models.ProcessorContext): IClientOptions {
    const { httpRegion, config } = context;

    const configOptions: IClientOptions = {};
    if (config?.request) {
      if (config.request.timeout !== undefined) {
        configOptions.connectTimeout = utils.toNumber(config.request.timeout);
      }
      if (!utils.isUndefined(config.request.rejectUnauthorized)) {
        configOptions.rejectUnauthorized = utils.toBoolean(config.request.rejectUnauthorized, true);
      }
    }
    if (httpRegion.metaData.noRejectUnauthorized) {
      configOptions.rejectUnauthorized = false;
    }

    const headers = Object.fromEntries(
      Object.entries(request.headers || {}).filter(
        ([key]) => ['topic', 'qos', 'retain', 'subscribe', 'publish'].indexOf(key.toLowerCase()) < 0
      )
    );

    return Object.assign({}, config?.request, request.options, configOptions, headers);
  }

  private subscribeToTopics(client: MqttClient, topics: string[], qos: QoS) {
    for (const topic of topics) {
      client.subscribe(topic, {
        qos,
      });
    }
  }
  private publishToTopics(client: MqttClient, topics: string[], request: MQTTRequest) {
    if (request.body) {
      for (const topic of topics) {
        client.publish(
          topic,
          request.body,
          {
            qos: this.toQoS(utils.getHeaderString(request.headers, 'qos')),
            retain: !!utils.getHeader(request.headers, 'retain'),
          },
          err => err && io.log.error('publish error', err)
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

  private toMergedHttpResponse(
    data: Array<MQTTMessage | Error>,
    responseTemplate: Partial<models.HttpResponse>
  ): models.HttpResponse {
    const body = utils.stringifySafe(data, 2);
    const rawBody: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(body);
    const response: models.HttpResponse = {
      statusCode: 0,
      protocol: 'MQTT',
      contentType: {
        mimeType: 'application/json',
        charset: 'UTF-8',
        contentType: 'application/json; charset=utf-8',
      },
      headers: {},
      ...responseTemplate,
      body,
      rawBody,
    };

    const error = data.find(obj => this.isMQTTError(obj));
    if (error && this.isMQTTError(error)) {
      response.statusCode = error.errno || -1;
      response.statusMessage = error.code;
    }
    return response;
  }

  private isMQTTError(data: unknown): data is Error & { code: string; errno: number } {
    return data instanceof Error;
  }
}
