import { utils } from '../../..';
import { AmqpRequest } from '../amqpRequest';

export const AmqpChannelId = 'amqp_channel_id';
export const AmqpQueue = 'amqp_queue';
export const AmqpExchange = 'amqp_exchange';
export const AmqpMethod = 'amqp_method';
export const AmqpExchangeDestination = 'amqp_exchange_destination';
export const AmqpRoutingKey = 'amqp_routing_key';
export const AmqpTag = 'amqp_tag';
export const AmqpNoAck = 'amqp_no_ack';
export const AmqpExclusive = 'amqp_exclusive';

export const AmqpMandatory = 'amqp_mandatory';
export const AmqpInternal = 'amqp_internal';
export const AmqpCorrelationId = 'amqp_correlation_id';
export const AmqpContentType = 'amqp_content_type';
export const AmqpContentEncoding = 'amqp_content_encoding';
export const AmqpDeliveryMode = 'amqp_delivery_mode';
export const AmqpExpiration = 'amqp_expiration';
export const AmqpMessageId = 'amqp_message_id';
export const AmqpPriority = 'amqp_priority';
export const AmqpReplyTo = 'amqp_replyTo';
export const AmqpType = 'amqp_type';
export const AmqpUserId = 'amqp_user_id';

export const AmqpRequeue = 'amqp_requeue';
export const AmqpMultiple = 'amqp_multiple';

export const AmqpIfUnused = 'amqp_if_unused';
export const AmqpIfEmpty = 'amqp_if_empty';

export const AmqpPassive = 'amqp_passive';
export const AmqpDurable = 'amqp_durable';
export const AmqpAutoDelete = 'amqp_auto_delete';

export function getAmqpMethod(request: AmqpRequest) {
  let method = utils.getHeaderString(request.headers, AmqpMethod);
  if (!method) {
    if (request.body) {
      method = 'publish';
    } else {
      method = 'consume';
    }
  }
  return method;
}
