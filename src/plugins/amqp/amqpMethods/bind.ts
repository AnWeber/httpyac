import * as utils from '../../../utils';
import * as constants from './amqpConstants';
import { AmqpMethodContext } from './amqpMethodContext';
import { getNonAmqpHeaders } from './amqpUtils';

export async function bind({ channel, request, onMessage }: AmqpMethodContext) {
  const exchanges = utils.getHeaderArray(request.headers, constants.AmqpExchange);
  const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
  const destinationExchanges = utils.getHeaderArray(request.headers, constants.AmqpExchangeDestination);
  const routingKey = utils.getHeaderString(request.headers, constants.AmqpRoutingKey) || '';
  for (const exchange of exchanges) {
    for (const queue of queues) {
      const result = await channel.queueBind(queue, exchange, routingKey, getNonAmqpHeaders(request.headers));
      onMessage(queue, {
        protocol: 'AMQP',
        name: `AMQP bind ${routingKey}`,
        statusCode: 0,
        headers: {
          channelId: channel.id,
          method: 'bind',
          queue,
          exchange,
        },
        request,
        message: `bind ${exchange} (${routingKey}, ${queue})`,
        body: utils.stringifySafe({
          bind: true,
          routingKey,
          result,
          queue,
          exchange,
        }),
      });
    }
    for (const destination of destinationExchanges) {
      const result = await channel.exchangeBind(destination, exchange, routingKey, getNonAmqpHeaders(request.headers));
      onMessage(exchange, {
        protocol: 'AMQP',
        name: `AMQP bind ${routingKey}`,
        statusCode: 0,
        headers: {
          channelId: channel.id,
          method: 'bind',
          exchange,
        },
        request,
        message: `bind ${exchange} (${routingKey}, ${destination})`,
        body: utils.stringifySafe({
          bind: true,
          routingKey,
          result,
          exchange,
        }),
      });
    }
  }
  return undefined;
}
