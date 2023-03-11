import * as utils from '../../../utils';
import * as constants from './amqpConstants';
import { AmqpMethodContext } from './amqpMethodContext';

export async function deleteMessage({ channel, request, onMessage }: AmqpMethodContext) {
  const exchanges = utils.getHeaderArray(request.headers, constants.AmqpExchange);
  const options = {
    ifUnused: utils.getHeaderBoolean(request.headers, constants.AmqpIfUnused, true),
    ifEmpty: utils.getHeaderBoolean(request.headers, constants.AmqpIfEmpty),
  };
  for (const exchange of exchanges) {
    const result = await channel.exchangeDelete(exchange, options);
    onMessage(exchange, {
      protocol: 'AMQP',
      name: `AMQP delete`,
      statusCode: 0,
      headers: {
        channelId: channel.id,
        exchange,
        method: 'delete',
      },
      request,
      message: `delete`,
      body: utils.stringifySafe(
        {
          ...options,
          delete: true,
          result,
        },
        2
      ),
    });
  }
  const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
  for (const queue of queues) {
    const result = await channel.queueDelete(queue, options);
    onMessage(queue, {
      protocol: 'AMQP',
      name: `AMQP delete`,
      statusCode: 0,
      headers: {
        channelId: channel.id,
        queue,
        method: 'delete',
      },
      request,
      message: `delete`,
      body: utils.stringifySafe(
        {
          ...options,
          delete: true,
          result,
        },
        2
      ),
    });
  }
  return undefined;
}
