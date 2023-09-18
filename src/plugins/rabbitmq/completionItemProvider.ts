import { CompletionItem, completionItemProvider } from '../../io';
import * as utils from '../../utils';
import { isAmqpRequest } from './amqpRequest';

completionItemProvider.emptyLineProvider.push(() => [
  {
    name: 'AMQP',
    description: 'AMQP request',
  },
]);

completionItemProvider.requestHeaderProvider.push(request => {
  const result: Array<CompletionItem> = [];
  if (isAmqpRequest(request)) {
    result.push(
      ...[
        { name: 'amqp_exchange', description: 'Exchange' },
        { name: 'amqp_queue', description: 'Queue' },
        {
          name: 'amqp_method',
          description:
            'Method (default if no body, consume, with body publish. Valid Values: bind, unbind, declare, delete, consume, publish, purge, ack, nack, cancel',
        },
        { name: 'amqp_routing_key', description: 'Routing Key' },
      ]
    );

    const method = utils.getHeader(request?.headers, 'amqp_method') || '';
    if (utils.isString(method)) {
      switch (method.toLowerCase()) {
        case 'bind':
        case 'unbind':
          result.push(
            ...[
              {
                name: 'amqp_exchange_destination',
                description: 'Exchange destination for Bind/ Unbind',
              },
            ]
          );
          break;
        case 'declare':
          result.push(
            ...[
              {
                name: 'amqp_passive',
                description: `if the exchange name doesn't exists the channel will be closed with an error, fulfilled if the exchange name does exists`,
              },
              {
                name: 'amqp_durable',
                description: 'if the exchange should survive server restarts',
              },
              {
                name: 'amqp_auto_delete',
                description: 'if the exchange should be deleted when the last binding from it is deleted',
              },
              {
                name: 'amqp_internal',
                description: `if exchange is internal to the server. Client's can't publish to internal exchanges.`,
              },
            ]
          );
          break;
        case 'delete':
          result.push(
            ...[
              {
                name: 'amqp_if_unused',
                description: `only delete if the queue doesn't have any consumers`,
              },
              {
                name: 'amqp_if_empty',
                description: 'only delete if the queue is empty',
              },
            ]
          );
          break;
        case 'nack':
          result.push(
            {
              name: 'amqp_tag',
              description: 'tag of the consumer, will be server generated if left empty',
            },
            {
              name: 'amqp_requeue',
              description: `if the message should be requeued or removed`,
            },
            {
              name: 'amqp_multiple',
              description: `batch confirm all messages up to this delivery tag`,
            }
          );
          break;
        case 'ack':
          result.push(
            {
              name: 'amqp_tag',
              description: 'tag of the consumer, will be server generated if left empty',
            },
            {
              name: 'amqp_multiple',
              description: `batch confirm all messages up to this delivery tag`,
            }
          );
          break;
        case 'cancel':
          result.push({
            name: 'amqp_tag',
            description: 'tag of the consumer, will be server generated if left empty',
          });
          break;
        case 'consume':
        case 'publish':
        case '':
          result.push(
            ...[
              {
                name: 'amqp_tag',
                description: 'tag of the consumer, will be server generated if left empty',
              },
              {
                name: 'amqp_no_ack',
                description:
                  'if messages are removed from the server upon delivery, or have to be acknowledged (default: false)',
              },
              {
                name: 'amqp_exclusive',
                description:
                  'if this can be the only consumer of the queue, will return an Error if there are other consumers to the queue already',
              },

              {
                name: 'amqp_correlation_id',
                description: 'for RPC requests',
              },
              {
                name: 'amqp_content_type',
                description: 'content type of body, eg. application/json',
              },
              {
                name: 'amqp_content_encoding',
                description: 'content encoding of body, eg. gzip',
              },
              {
                name: 'amqp_deliveryMode',
                description: '1 for transient messages, 2 for persistent messages',
              },
              { name: 'amqp_expiration', description: 'Exchange' },
              {
                name: 'amqp_messageId',
                description: 'Message TTL, in milliseconds, as string',
              },
              { name: 'amqp_priority', description: 'between 0 and 255' },
              { name: 'amqp_replyTo', description: 'for RPC requests' },
              { name: 'amqp_type', description: 'type' },
              { name: 'amqp_userId', description: 'user id' },
              {
                name: 'amqp_mandatory',
                description: `if the message should be returned if there's no queue to be delivered to`,
              },
            ]
          );
          break;
        default:
          break;
      }
    }
  }
  return result;
});
