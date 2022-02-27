import * as io from '../../io';
import * as models from '../../models';
import * as store from '../../store';
import * as utils from '../../utils';
import * as constants from './amqpConstants';
import { AmqpRequest, isAmqpRequest } from './amqpRequest';
import { AMQPClient, AMQPChannel, AMQPProperties } from '@cloudamqp/amqp-client';

interface AmqpResponse {
  exchange?: string;
  queue?: string;
  channelId: number;
  message: Record<string, unknown>;
}

interface AmqpError {
  isError: true;
  message: string;
  name?: string;
  stack?: unknown;
}

interface AmqpSession {
  client: AMQPClient;
  channel: AMQPChannel;
}

interface AmqpMethodContext {
  channel: AMQPChannel;
  request: AmqpRequest;
  context: models.ProcessorContext;
  messages: Array<AmqpResponse | AmqpError>;
}
type AmqpMethod = (context: AmqpMethodContext) => Promise<void>;

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
    const messages: Array<AmqpResponse | AmqpError> = [];
    try {
      let disposeCancellation: models.Dispose | undefined;

      const { client, channel, closeClientOnFinish } = await this.getAmqpClient(request);
      const amqpVariables = {
        amqpClient: client,
        amqpChannel: channel,
      };
      if (context.progress) {
        disposeCancellation = context.progress?.register?.(async () => {
          disposeCancellation = undefined;
          if (closeClientOnFinish && !client.closed) {
            channel.close();
            client.close(`user cancellation`);
          }
        });
      }

      const method = this.getMethod(request);
      const useUserSessionStore = ['consume', 'subscribe'].indexOf(method.method) >= 0;
      if (useUserSessionStore) {
        this.setUserSession(request, client, channel);
      }

      await method.exchange({
        channel,
        request,
        context,
        messages,
      });
      utils.setVariableInContext(amqpVariables, context);
      const onStreaming = context.httpFile.hooks.onStreaming.merge(context.httpRegion.hooks.onStreaming);
      await onStreaming.trigger(context);

      utils.unsetVariableInContext(amqpVariables, context);
      if (disposeCancellation) {
        disposeCancellation();
        disposeCancellation = undefined;
      }
      if (closeClientOnFinish) {
        if (useUserSessionStore) {
          store.userSessionStore.removeUserSession(this.getAmqpSessionId(request, channel.id));
        }
        if (!client.closed) {
          if (!client.closed) {
            channel.close();
            client.close(`finished`);
          }
        }
      }
    } catch (err) {
      io.log.info(err);
      if (utils.isError(err)) {
        messages.push({
          isError: true,
          message: err.message,
          name: err.name,
          stack: err.stack,
        });
      } else {
        messages.push({
          isError: true,
          message: utils.toString(err) || `${err}`,
        });
      }
    }
    return this.toMergedHttpResponse(messages, request);
  }

  private async getAmqpClient(
    request: AmqpRequest
  ): Promise<{ client: AMQPClient; channel: AMQPChannel; closeClientOnFinish: boolean }> {
    const channelId = utils.getHeaderNumber(request.headers, constants.AmqpChannelId);
    if (channelId) {
      const userSession: (models.UserSession & Partial<AmqpSession>) | undefined =
        store.userSessionStore.getUserSession(this.getAmqpSessionId(request, channelId));
      if (userSession && userSession.client && userSession.channel) {
        return {
          client: userSession.client,
          channel: userSession.channel,
          closeClientOnFinish: false,
        };
      }
    }

    const client = new AMQPClient(request.url || '');
    await client.connect();
    const channel = await client.channel(channelId);

    return {
      client,
      channel,
      closeClientOnFinish: true,
    };
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
        if (!client.closed) {
          await channel.close('user cancellation');
          await client.close();
        }
      },
    };
    store.userSessionStore.setUserSession(session);
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
      return {
        method,
        exchange: amqpMethods[method],
      };
    }

    throw new Error(
      `Amqp Method ${method} not supported (supported: ${Object.entries(amqpMethods)
        .map(([key]) => key)
        .join(', ')})`
    );
  }

  private toMergedHttpResponse(messages: Array<AmqpResponse | AmqpError>, request: AmqpRequest): models.HttpResponse {
    const body = JSON.stringify(messages, null, 2);
    const rawBody: Buffer = Buffer.isBuffer(messages) ? messages : Buffer.from(body);
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
    const err = messages.some(obj => this.isAmqpError(obj));
    if (this.isAmqpError(err)) {
      response.statusCode = -1;
      response.statusMessage = err.message;
    }

    return response;
  }
  private isAmqpError(obj: unknown): obj is AmqpError {
    const guard = obj as AmqpError;
    return guard?.isError;
  }

  private async publish({ channel, request, messages }: AmqpMethodContext) {
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
          channelId: channel.id,
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
          channelId: channel.id,
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
  }

  private async consume({ channel, request, messages, context }: AmqpMethodContext) {
    const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
    const options = {
      tag: utils.getHeaderString(request.headers, constants.AmqpTag),
      noAck: utils.getHeaderBoolean(request.headers, constants.AmqpNoAck, false),
      exclusive: utils.getHeaderBoolean(request.headers, constants.AmqpExclusive, false),
      args: getNonAmqpHeaders(request.headers),
    };
    for (const queue of queues) {
      await channel.basicConsume(queue, options, async message => {
        const result = {
          channelId: channel.id,
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
            await context.logStream(queue, {
              request,
              name: `AMQP ${queue}-${result.deliveryTag} (${request.url})`,
              protocol: 'AMQP',
              statusCode: 0,
              message: `${result.body} (deliveryTag: ${result.deliveryTag}, channelId: ${result.channelId})`,
              body: result.body,
              headers: result,
            });
          }
        }
        messages.push({
          channelId: channel.id,
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
  }
  private async delete({ channel, request, messages }: AmqpMethodContext) {
    const exchanges = utils.getHeaderArray(request.headers, constants.AmqpExchange);
    const options = {
      ifUnused: utils.getHeaderBoolean(request.headers, constants.AmqpIfUnused, true),
      ifEmpty: utils.getHeaderBoolean(request.headers, constants.AmqpIfEmpty),
    };
    for (const exchange of exchanges) {
      const result = await channel.exchangeDelete(exchange, options);
      messages.push({
        channelId: channel.id,
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
        channelId: channel.id,
        queue,
        message: {
          ...options,
          delete: true,
          result,
        },
      });
    }
  }
  private async declare({ channel, request, messages }: AmqpMethodContext) {
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
        channelId: channel.id,
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
        channelId: channel.id,
        queue,
        message: {
          ...options,
          declare: true,
          result,
        },
      });
    }
  }
  private async bind({ channel, request, messages }: AmqpMethodContext) {
    const exchanges = utils.getHeaderArray(request.headers, constants.AmqpExchange);
    const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
    const destinationExchanges = utils.getHeaderArray(request.headers, constants.AmqpExchangeDestination);
    const routingKey = utils.getHeaderString(request.headers, constants.AmqpRoutingKey) || '';
    for (const exchange of exchanges) {
      for (const queue of queues) {
        const result = await channel.queueBind(queue, exchange, routingKey, getNonAmqpHeaders(request.headers));
        messages.push({
          channelId: channel.id,
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
          channelId: channel.id,
          exchange,
          message: {
            destination,
            bind: true,
            result,
          },
        });
      }
    }
  }
  private async unbind({ channel, request, messages }: AmqpMethodContext) {
    const exchanges = utils.getHeaderArray(request.headers, constants.AmqpExchange);
    const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
    const destinationExchanges = utils.getHeaderArray(request.headers, constants.AmqpExchangeDestination);
    const routingKey = utils.getHeaderString(request.headers, constants.AmqpRoutingKey) || '';
    for (const exchange of exchanges) {
      for (const queue of queues) {
        const result = await channel.queueUnbind(queue, exchange, routingKey, getNonAmqpHeaders(request.headers));
        messages.push({
          channelId: channel.id,
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
          channelId: channel.id,
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
  }
  private async purge({ channel, request, messages }: AmqpMethodContext) {
    const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
    for (const queue of queues) {
      const result = await channel.queuePurge(queue);
      messages.push({
        queue,
        channelId: channel.id,
        message: {
          purge: true,
          result,
        },
      });
    }
  }
  private async ack({ channel, request, messages }: AmqpMethodContext) {
    const tags = utils.getHeaderArray(request.headers, constants.AmqpTag);
    for (const tag of tags) {
      const result = await channel.basicAck(
        Number(tag),
        utils.getHeaderBoolean(request.headers, constants.AmqpMultiple, true)
      );
      messages.push({
        channelId: channel.id,
        message: {
          tag,
          ack: true,
          result,
        },
      });
    }
  }
  private async cancel({ channel, request, messages }: AmqpMethodContext) {
    const tags = utils.getHeaderArray(request.headers, constants.AmqpTag);
    for (const tag of tags) {
      const result = await channel.basicCancel(tag);
      messages.push({
        channelId: channel.id,
        message: {
          tag,
          cancel: true,
          result,
        },
      });
    }
  }
  private async nack({ channel, request, messages }: AmqpMethodContext) {
    const tags = utils.getHeaderArray(request.headers, constants.AmqpTag);
    for (const tag of tags) {
      const result = await channel.basicNack(
        Number(tag),
        utils.getHeaderBoolean(request.headers, constants.AmqpRequeue, false),
        utils.getHeaderBoolean(request.headers, constants.AmqpMultiple, false)
      );
      messages.push({
        channelId: channel.id,
        message: {
          tag,
          nack: true,
          result,
        },
      });
    }
  }
}
function getNonAmqpHeaders(headers: Record<string, string | Array<string> | undefined> | undefined) {
  if (headers) {
    return Object.fromEntries(Object.entries(headers).filter(([key]) => !key.startsWith('amqp')));
  }
  return undefined;
}
