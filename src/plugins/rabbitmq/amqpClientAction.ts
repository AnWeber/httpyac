import * as io from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import * as constants from './amqpConstants';
import { AmqpRequest, isAmqpRequest } from './amqpRequest';
import { AMQPClient, AMQPChannel, AMQPProperties } from '@cloudamqp/amqp-client';

interface AmqpResponse {
  exchange?: string;
  queue?: string;
  message: Record<string, unknown>;
}
type AmqpMethod = (
  channel: AMQPChannel,
  request: AmqpRequest,
  context: models.ProcessorContext
) => Promise<Array<AmqpResponse>>;

export class AmqpClientAction {
  id = 'amqp';

  async process(context: models.ProcessorContext): Promise<boolean> {
    const { request } = context;
    if (isAmqpRequest(request)) {
      return await utils.triggerRequestResponseHooks(async () => {
        if (request.url) {
          utils.report(context, `request AMQP ${request.url}`);
          return await this.requestAmqp(request, context);
        }
        return false;
      }, context);
    }
    return false;
  }

  private async requestAmqp(
    request: AmqpRequest,
    context: models.ProcessorContext
  ): Promise<models.HttpResponse | false> {
    if (!request.url) {
      throw new Error('request url undefined');
    }
    try {
      let disposeCancellation: models.Dispose | undefined;

      const amqpClient = new AMQPClient(request.url);

      const connection = await amqpClient.connect();
      const amqpChannel = await connection.channel(utils.getHeaderNumber(request.headers, constants.AmqpChannelId));

      const amqpVariables = {
        amqpClient,
        amqpChannel,
      };
      if (context.progress) {
        disposeCancellation = context.progress?.register?.(async () => {
          disposeCancellation = undefined;
          await amqpChannel.close('user cancellation');
        });
      }

      const method = this.getMethod(request);

      const messages = await method(amqpChannel, request, context);
      utils.setVariableInContext(amqpVariables, context);
      const onStreaming = context.httpFile.hooks.onStreaming.merge(context.httpRegion.hooks.onStreaming);
      await onStreaming.trigger(context);

      utils.unsetVariableInContext(amqpVariables, context);
      if (disposeCancellation) {
        disposeCancellation();
      } else {
        await amqpChannel.close();
      }
      return this.toMergedHttpResponse(messages, request);
    } catch (err) {
      io.log.info(err);
      return this.errorToHttpResponse(err, request);
    }
  }

  private getMethod(request: AmqpRequest) {
    let method = utils.getHeaderString(request.headers, constants.AmqpMethod);
    if (!method) {
      if (request.body) {
        method = 'publish';
      } else {
        method = 'subscribe';
      }
    }
    const amqpMethods: Record<string, AmqpMethod> = {
      ack: this.ack,
      bind: this.bind,
      cancel: this.cancel,
      consume: this.consume,
      declare: this.declare,
      delete: this.delete,
      nack: this.nack,
      publish: this.publish,
      purge: this.purge,
      subscribe: this.consume,
      unbind: this.unbind,
    };
    if (method) {
      return amqpMethods[method];
    }

    throw new Error(
      `Amqp Method ${method} not supported (supported: ${Object.entries(amqpMethods)
        .map(([key]) => key)
        .join(', ')})`
    );
  }

  private errorToHttpResponse(err: unknown, request: AmqpRequest) {
    let body: string;

    if (utils.isError(err)) {
      body = JSON.stringify(
        {
          message: err.message,
          name: err.name,
          stack: err.stack,
        },
        null,
        2
      );
    } else {
      body = JSON.stringify(err, null, 2);
    }
    const response: models.HttpResponse = {
      statusCode: 500,
      protocol: 'AMQP',
      statusMessage: utils.isError(err) ? err.message : `${err}`,
      body,
      request,
    };
    return response;
  }

  private toMergedHttpResponse(data: Array<AmqpResponse>, request: AmqpRequest): models.HttpResponse {
    const body = JSON.stringify(data, null, 2);
    const rawBody: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(body);
    const response: models.HttpResponse = {
      statusCode: 0,
      protocol: 'AMQP',
      contentType: {
        mimeType: 'application/json',
        charset: 'UTF-8',
        contentType: 'application/json; charset=utf-8',
      },
      headers: {},
      request,
      body,
      rawBody,
    };

    return response;
  }

  private async publish(channel: AMQPChannel, request: AmqpRequest) {
    const messages: Array<AmqpResponse> = [];
    if (request.body) {
      const properties: AMQPProperties = {
        appId: 'httpyac',
        timestamp: new Date(),
        correlationId: utils.getHeaderString(request.headers, constants.AmqpCorrelationId),
        contentType:
          utils.getHeaderString(request.headers, constants.AmqpContentType) ||
          utils.getHeaderString(request.headers, 'content-type'),
        contentEncoding: utils.getHeaderString(request.headers, constants.AmqpContentEncoding),
        deliveryMode: utils.getHeaderNumber(request.headers, constants.AmqpDeliveryMode),
        expiration: utils.getHeaderString(request.headers, constants.AmqpExpiration),
        messageId: utils.getHeaderString(request.headers, constants.AmqpMessageId),
        priority: utils.getHeaderNumber(request.headers, constants.AmqpPriority),
        replyTo: utils.getHeaderString(request.headers, constants.AmqpReplyTo),
        type: utils.getHeaderString(request.headers, constants.AmqpType),
        userId: utils.getHeaderString(request.headers, constants.AmqpUserId),
        headers: getNonAmqpHeaders(request.headers),
      };
      const exchanges = utils.getHeaderArray(request.headers, constants.AmqpExchange);
      const routingKey = utils.getHeaderString(request.headers, constants.AmqpRoutingKey) || '';
      for (const exchange of exchanges) {
        const publish = await channel.basicPublish(
          exchange,
          routingKey,
          request.body,
          properties,
          utils.getHeaderBoolean(request.headers, constants.AmqpMandatory)
        );
        messages.push({
          exchange,
          message: {
            published: true,
            ...properties,
            routingKey,
            publish,
            body: request.body,
          },
        });
      }
      const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
      for (const queue of queues) {
        const publish = await channel.basicPublish(
          '',
          queue,
          request.body,
          properties,
          utils.getHeaderBoolean(request.headers, constants.AmqpMandatory)
        );
        messages.push({
          queue,
          message: {
            published: true,
            routingKey,
            publish,
          },
        });
      }

      if (queues.length === 0 && exchanges.length === 0) {
        const message = `no queues or exchanges to publish`;
        io.userInteractionProvider.showWarnMessage?.(message);
        io.log.warn(message);
      }
    } else {
      const message = `no body for publish`;
      io.userInteractionProvider.showWarnMessage?.(message);
      io.log.warn(message);
    }
    return messages;
  }

  private async consume(channel: AMQPChannel, request: AmqpRequest, context: models.ProcessorContext) {
    const messages: Array<AmqpResponse> = [];
    const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
    const options = {
      tag: utils.getHeaderString(request.headers, constants.AmqpTag),
      noAck: utils.getHeaderBoolean(request.headers, constants.AmqpNoAck, false),
      exclusive: utils.getHeaderBoolean(request.headers, constants.AmqpExclusive, false),
      args: getNonAmqpHeaders(request.headers),
    };
    for (const queue of queues) {
      await channel.basicConsume(queue, options, message => {
        const result = {
          exchange: message.exchange,
          routingKey: message.routingKey,
          bodySize: message.bodySize,
          deliveryTag: message.deliveryTag,
          consumerTag: message.consumerTag,
          redelivered: message.redelivered,
          messageCount: message.messageCount,
          replyCode: message.replyCode,
          replyText: message.replyCode,
          body: message.bodyString(),
          options,
        };
        if (!context.httpRegion.metaData.noStreamingLog) {
          if (context.logStream) {
            context.logStream('AMQP', queue, result);
          }
        }
        messages.push({
          queue,
          message: result,
        });
      });
    }
    if (queues.length === 0) {
      const message = `no queues to consume`;
      io.userInteractionProvider.showWarnMessage?.(message);
      io.log.warn(message);
    }
    return messages;
  }
  private async delete(channel: AMQPChannel, request: AmqpRequest) {
    const messages: Array<AmqpResponse> = [];
    const exchanges = utils.getHeaderArray(request.headers, constants.AmqpExchange);
    const options = {
      ifUnused: utils.getHeaderBoolean(request.headers, constants.AmqpIfUnused, true),
      ifEmpty: utils.getHeaderBoolean(request.headers, constants.AmqpIfEmpty),
    };
    for (const exchange of exchanges) {
      const result = await channel.exchangeDelete(exchange, options);
      messages.push({
        exchange,
        message: {
          ...options,
          delete: true,
          result,
        },
      });
    }
    const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
    for (const queue of queues) {
      const result = await channel.queueDelete(queue, options);
      messages.push({
        queue,
        message: {
          ...options,
          delete: true,
          result,
        },
      });
    }
    return messages;
  }
  private async declare(channel: AMQPChannel, request: AmqpRequest) {
    const messages: Array<AmqpResponse> = [];
    const exchanges = utils.getHeaderArray(request.headers, constants.AmqpExchange);
    const options = {
      passive: utils.getHeaderBoolean(request.headers, constants.AmqpPassive, false),
      durable: utils.getHeaderBoolean(request.headers, constants.AmqpDurable, true),
      autoDelete: utils.getHeaderBoolean(request.headers, constants.AmqpAutoDelete, false),
      internal: utils.getHeaderBoolean(request.headers, constants.AmqpInternal),
    };
    for (const exchange of exchanges) {
      const type = utils.getHeaderString(request.headers, constants.AmqpType) || 'direct';
      const result = await channel.exchangeDeclare(exchange, type, options);
      messages.push({
        exchange,
        message: {
          ...options,
          declare: true,
          type,
          result,
        },
      });
    }
    const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
    for (const queue of queues) {
      const result = await channel.queueDeclare(queue, options);
      messages.push({
        queue,
        message: {
          ...options,
          declare: true,
          result,
        },
      });
    }
    return messages;
  }
  private async bind(channel: AMQPChannel, request: AmqpRequest) {
    const messages: Array<AmqpResponse> = [];
    const exchanges = utils.getHeaderArray(request.headers, constants.AmqpExchange);
    const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
    const destinationExchanges = utils.getHeaderArray(request.headers, constants.AmqpExchangeDestination);
    const routingKey = utils.getHeaderString(request.headers, constants.AmqpRoutingKey) || '';
    for (const exchange of exchanges) {
      for (const queue of queues) {
        const result = await channel.queueBind(queue, exchange, routingKey, getNonAmqpHeaders(request.headers));
        messages.push({
          queue,
          exchange,
          message: {
            bind: true,
            routingKey,
            result,
          },
        });
      }
      for (const destination of destinationExchanges) {
        const result = await channel.exchangeBind(
          destination,
          exchange,
          routingKey,
          getNonAmqpHeaders(request.headers)
        );
        messages.push({
          exchange,
          message: {
            destination,
            bind: true,
            result,
          },
        });
      }
    }
    return messages;
  }
  private async unbind(channel: AMQPChannel, request: AmqpRequest) {
    const messages: Array<AmqpResponse> = [];
    const exchanges = utils.getHeaderArray(request.headers, constants.AmqpExchange);
    const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
    const destinationExchanges = utils.getHeaderArray(request.headers, constants.AmqpExchangeDestination);
    const routingKey = utils.getHeaderString(request.headers, constants.AmqpRoutingKey) || '';
    for (const exchange of exchanges) {
      for (const queue of queues) {
        const result = await channel.queueUnbind(queue, exchange, routingKey, getNonAmqpHeaders(request.headers));
        messages.push({
          queue,
          exchange,
          message: {
            routingKey,
            unbind: true,
            result,
          },
        });
      }
      for (const destination of destinationExchanges) {
        const result = await channel.exchangeUnbind(
          destination,
          exchange,
          routingKey,
          getNonAmqpHeaders(request.headers)
        );
        messages.push({
          exchange,
          message: {
            routingKey,
            destination,
            unbind: true,
            result,
          },
        });
      }
    }
    return messages;
  }
  private async purge(channel: AMQPChannel, request: AmqpRequest) {
    const messages: Array<AmqpResponse> = [];
    const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
    for (const queue of queues) {
      const result = await channel.queuePurge(queue);
      messages.push({
        queue,
        message: {
          purge: true,
          result,
        },
      });
    }

    return messages;
  }
  private async ack(channel: AMQPChannel, request: AmqpRequest) {
    const messages: Array<AmqpResponse> = [];
    const tags = utils.getHeaderArray(request.headers, constants.AmqpTag);
    for (const tag of tags) {
      const result = await channel.basicAck(Number(tag));
      messages.push({
        message: {
          tag,
          ack: true,
          result,
        },
      });
    }
    return messages;
  }
  private async cancel(channel: AMQPChannel, request: AmqpRequest) {
    const messages: Array<AmqpResponse> = [];
    const tags = utils.getHeaderArray(request.headers, constants.AmqpTag);
    for (const tag of tags) {
      const result = await channel.basicCancel(tag);
      messages.push({
        message: {
          tag,
          cancel: true,
          result,
        },
      });
    }
    return messages;
  }
  private async nack(channel: AMQPChannel, request: AmqpRequest) {
    const messages: Array<AmqpResponse> = [];
    const tags = utils.getHeaderArray(request.headers, constants.AmqpTag);
    for (const tag of tags) {
      const result = await channel.basicNack(Number(tag));
      messages.push({
        message: {
          tag,
          nack: true,
          result,
        },
      });
    }
    return messages;
  }
}
function getNonAmqpHeaders(headers: Record<string, string | Array<string> | undefined> | undefined) {
  if (headers) {
    return Object.fromEntries(Object.entries(headers).filter(([key]) => !key.startsWith('amqp')));
  }
  return undefined;
}
