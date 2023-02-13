import { completionItemProvider } from '../../io';

completionItemProvider.emptyLineProvider.push(() => [
  {
    name: 'WSS',
    description: 'WSS request',
  },
]);
