import { AMQPProperties } from '@cloudamqp/amqp-client';

import * as io from '../../../io';
import * as utils from '../../../utils';
import * as constants from './amqpConstants';
import { AmqpMethodContext } from './amqpMethodContext';
import { getNonAmqpHeaders } from './amqpUtils';

export async function publish({ channel, request, onMessage }: AmqpMethodContext) {
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
      onMessage(exchange, {
        protocol: 'AMQP',
        name: `AMQP publish ${routingKey}`,
        statusCode: 0,
        headers: {
          exchange,
          channelId: channel.id,
        },
        request,
        message: `publish ${routingKey}`,
        body: utils.stringifySafe(
          {
            published: true,
            ...properties,
            routingKey,
            publish,
          },
          2
        ),
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
      onMessage(queue, {
        protocol: 'AMQP',
        name: `AMQP publish ${routingKey}`,
        statusCode: 0,
        headers: {
          queue,
          channelId: channel.id,
        },
        request,
        message: `publish ${routingKey}`,
        body: utils.stringifySafe({
          published: true,
          routingKey,
          publish,
        }),
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

  return undefined;
}
