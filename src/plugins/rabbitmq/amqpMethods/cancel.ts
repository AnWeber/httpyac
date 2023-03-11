import * as utils from '../../../utils';
import * as constants from './amqpConstants';
import { AmqpMethodContext } from './amqpMethodContext';

export async function cancel({ channel, request }: AmqpMethodContext) {
  const tags = utils.getHeaderArray(request.headers, constants.AmqpTag);
  for (const tag of tags) {
    const result = await channel.basicCancel(tag);
    return {
      protocol: 'AMQP',
      name: `AMQP cancel`,
      statusCode: 0,
      headers: {
        channelId: channel.id,
        method: 'cancel',
      },
      request,
      body: utils.stringifySafe(
        {
          tag,
          cancel: true,
          result,
        },
        2
      ),
    };
  }
  return undefined;
}
