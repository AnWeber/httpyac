import * as utils from '../../../utils';
import * as constants from './amqpConstants';
import { AmqpMethodContext } from './amqpMethodContext';

export async function nack({ channel, request }: AmqpMethodContext) {
  const tags = utils.getHeaderArray(request.headers, constants.AmqpTag);
  for (const tag of tags) {
    const result = await channel.basicNack(
      Number(tag),
      utils.getHeaderBoolean(request.headers, constants.AmqpRequeue, false),
      utils.getHeaderBoolean(request.headers, constants.AmqpMultiple, false)
    );
    return {
      protocol: 'AMQP',
      name: `AMQP nack`,
      statusCode: 0,
      headers: {
        channelId: channel.id,
        method: 'nack',
      },
      request,
      body: utils.stringifySafe(
        {
          tag,
          nack: true,
          result,
        },
        2
      ),
    };
  }
  return undefined;
}
