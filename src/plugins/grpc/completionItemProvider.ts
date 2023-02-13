import { completionItemProvider } from '../../io';
import { isGrpcRequest } from './grpcRequest';

completionItemProvider.emptyLineProvider.push(() => [
  {
    name: 'GRPC',
    description: 'GRPC request',
  },
  {
    name: 'proto < ./',
    description: 'Proto Import',
  },
]);

completionItemProvider.requestHeaderProvider.push(request => {
  const result = [];
  if (isGrpcRequest(request)) {
    result.push(
      ...[
        {
          name: 'ChannelCredentials',
          description: 'Channel credentials, which are attached to a Channel, such as SSL credentials.',
        },
      ]
    );
  }
  return result;
});
