import * as io from '../../../io';
import * as utils from '../../../utils';
import * as constants from './amqpConstants';
import { AmqpMethodContext } from './amqpMethodContext';
import { getNonAmqpHeaders } from './amqpUtils';

export async function consume({ channel, request, onMessage }: AmqpMethodContext) {
  const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
  const options = {
    tag: utils.getHeaderString(request.headers, constants.AmqpTag),
    noAck: utils.getHeaderBoolean(request.headers, constants.AmqpNoAck, false),
    exclusive: utils.getHeaderBoolean(request.headers, constants.AmqpExclusive, false),
    args: getNonAmqpHeaders(request.headers),
  };
  for (const queue of queues) {
    channel.basicConsume(queue, options, async message => {
      onMessage(queue, {
        protocol: 'AMQP',
        name: `AMQP consume ${queue}`,
        statusCode: 0,
        headers: {
          channelId: channel.id,
          method: 'consume',
          queue,
          exchange: message.exchange,
          routingKey: message.routingKey,
          bodySize: message.bodySize,
          deliveryTag: message.deliveryTag,
          consumerTag: message.consumerTag,
          redelivered: message.redelivered,
          messageCount: message.messageCount,
          replyCode: message.replyCode,
          replyText: message.replyCode,
          options,
        },
        request,
        message: `${message.bodyString()} (deliveryTag: ${message.deliveryTag}, channel: ${message.channel.id})`,
        body: message.bodyString(),
        rawBody: message.body ? Buffer.from(message.body) : undefined,
      });
    });
  }
  if (queues.length === 0) {
    const message = `no queues to consume`;
    io.userInteractionProvider.showWarnMessage?.(message);
    io.log.warn(message);
  }
  return undefined;
}
