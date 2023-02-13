import { completionItemProvider } from '../../io';

completionItemProvider.emptyLineProvider.push(() => [
  {
    name: '{{@streaming\n',
    description: 'Streaming Javascript Block',
  },
  {
    name: '{{@response\n',
    description: 'Response Javascript Block',
  },
  {
    name: '{{@request\n',
    description: 'Request Javascript Block',
  },
]);
