import * as utils from '../../../utils';
import * as constants from './amqpConstants';
import { AmqpMethodContext } from './amqpMethodContext';
import { getNonAmqpHeaders } from './amqpUtils';

export async function unbind({ channel, request, onMessage }: AmqpMethodContext) {
  const exchanges = utils.getHeaderArray(request.headers, constants.AmqpExchange);
  const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
  const destinationExchanges = utils.getHeaderArray(request.headers, constants.AmqpExchangeDestination);
  const routingKey = utils.getHeaderString(request.headers, constants.AmqpRoutingKey) || '';

  const nonAmqpHeaders = getNonAmqpHeaders(request.headers);
  for (const exchange of exchanges) {
    for (const queue of queues) {
      const result = await channel.queueUnbind(queue, exchange, routingKey, nonAmqpHeaders);
      onMessage(queue, {
        protocol: 'AMQP',
        name: `AMQP unbind ${routingKey}`,
        statusCode: 0,
        headers: {
          channelId: channel.id,
          queue,
          exchange,
          method: 'unbind',
        },
        request,
        message: `unbind ${exchange} (${routingKey}, ${queue})`,
        body: utils.stringifySafe(
          {
            routingKey,
            unbind: true,
            result,
            queue,
            exchange,
          },
          2
        ),
      });
    }
    for (const destination of destinationExchanges) {
      const result = await channel.exchangeUnbind(destination, exchange, routingKey, nonAmqpHeaders);
      onMessage(exchange, {
        protocol: 'AMQP',
        name: `AMQP unbind ${routingKey}`,
        statusCode: 0,
        headers: {
          channelId: channel.id,
          exchange,
          method: 'unbind',
        },
        request,
        message: `unbind ${exchange} (${routingKey}, ${destination})`,
        body: utils.stringifySafe(
          {
            routingKey,
            destination,
            unbind: true,
            result,
            exchange,
          },
          2
        ),
      });
    }
  }
  return undefined;
}
