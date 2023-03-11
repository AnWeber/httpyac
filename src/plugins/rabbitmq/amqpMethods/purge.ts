import * as utils from '../../../utils';
import * as constants from './amqpConstants';
import { AmqpMethodContext } from './amqpMethodContext';

export async function purge({ channel, request, onMessage }: AmqpMethodContext) {
  const queues = utils.getHeaderArray(request.headers, constants.AmqpQueue);
  for (const queue of queues) {
    const result = await channel.queuePurge(queue);
    onMessage(queue, {
      protocol: 'AMQP',
      name: `AMQP purge`,
      statusCode: 0,
      headers: {
        queue,
        channelId: channel.id,
      },
      request,
      message: `purge`,
      body: utils.stringifySafe(
        {
          purge: true,
          result,
        },
        2
      ),
    });
  }
  return undefined;
}
