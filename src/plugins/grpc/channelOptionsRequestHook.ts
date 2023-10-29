import * as models from '../../models';
import * as utils from '../../utils';
import { isGrpcRequest } from './grpcRequest';

export async function channelOptionsRequestHook(
  request: models.Request,
  context: models.ProcessorContext
): Promise<void> {
  if (isGrpcRequest(request) && request.headers) {
    utils.report(context, 'create channel options');
    if (!request.options) {
      request.options = {};
    }
    for (const [key, value] of Object.entries(request.headers)) {
      if (key.startsWith('grpc.')) {
        utils.deleteHeader(request.headers, key);
        if (utils.isString(value) || Number.isInteger(value)) {
          const numberOptions = [
            'grpc.keepalive_time_ms',
            'grpc.keepalive_timeout_ms',
            'grpc.keepalive_permit_without_calls',
            'grpc.max_concurrent_streams',
            'grpc.initial_reconnect_backoff_ms',
            'grpc.max_reconnect_backoff_ms',
            'grpc.use_local_subchannel_pool',
            'grpc.max_send_message_length',
            'grpc.max_receive_message_length',
            'grpc.enable_http_proxy',
            'grpc.default_compression_algorithm',
            'grpc.enable_channelz',
            'grpc.dns_min_time_between_resolutions_ms',
            'grpc-node.max_session_memory',
          ];
          if (numberOptions.indexOf(key) >= 0) {
            request.options[key] = utils.toNumber(value);
          } else {
            request.options[key] = value;
          }
        }
      }
    }
  }
  return undefined;
}
