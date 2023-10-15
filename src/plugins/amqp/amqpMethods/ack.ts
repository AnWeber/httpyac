import * as utils from '../../../utils';
import * as constants from './amqpConstants';
import { AmqpMethodContext } from './amqpMethodContext';

export async function ack({ channel, request }: AmqpMethodContext) {
  const tags = utils.getHeaderArray(request.headers, constants.AmqpTag);
  for (const tag of tags) {
    const result = await channel.basicAck(
      Number(tag),
      utils.getHeaderBoolean(request.headers, constants.AmqpMultiple, true)
    );
    return {
      protocol: 'AMQP',
      name: `AMQP ack`,
      statusCode: 0,
      headers: {
        channelId: channel.id,
        method: 'ack',
      },
      request,
      body: utils.stringifySafe({
        tag,
        ack: true,
        result,
      }),
    };
  }
  return undefined;
}
