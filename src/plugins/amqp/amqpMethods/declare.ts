import * as utils from '../../../utils';
import * as constants from './amqpConstants';
import { AmqpMethodContext } from './amqpMethodContext';

export async function declare({ channel, request, onMessage }: AmqpMethodContext) {
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
    onMessage(exchange, {
      protocol: 'AMQP',
      name: `AMQP declare`,
      statusCode: 0,
      headers: {
        channelId: channel.id,
        exchange,
        method: 'declare',
      },
      request,
      message: `declare`,
      body: utils.stringifySafe(
        {
          ...options,
          declare: true,
          type,
          result,
        },
        2
      ),
    });
  }
  const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
  for (const queue of queues) {
    const result = await channel.queueDeclare(queue, options);
    onMessage(queue, {
      protocol: 'AMQP',
      name: `AMQP declare`,
      statusCode: 0,
      headers: {
        channelId: channel.id,
        queue,
        method: 'declare',
      },
      request,
      message: `declare`,
      body: utils.stringifySafe(
        {
          ...options,
          declare: true,
          result,
        },
        2
      ),
    });
  }
  return undefined;
}
