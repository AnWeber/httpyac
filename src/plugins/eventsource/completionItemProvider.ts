import { completionItemProvider } from '../../io';
import { isEventSourceRequest } from './eventSourceRequest';

completionItemProvider.emptyLineProvider.push(() => [
  {
    name: 'SSE',
    description: 'Server Sent Event',
  },
]);

completionItemProvider.requestHeaderProvider.push(request => {
  const result = [];
  if (isEventSourceRequest(request)) {
    result.push(...[{ name: 'Event', description: 'Server Sent Events to add listener' }]);
  }
  return result;
});
