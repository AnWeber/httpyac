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

completionItemProvider.variableProvider.push(() => [
  {
    name: '$random.alphabetic()',
    description: 'random letters',
  },
  {
    name: '$random.number()',
    description: 'random number',
  },
  {
    name: '$random.hexadecimal()',
    description: 'random hexadecimal',
  },
  {
    name: '$random.email()',
    description: 'random email',
  },
  {
    name: '$random.float()',
    description: 'random float',
  },
  {
    name: '$random.integer()',
    description: 'random integer',
  },
  {
    name: '$random.uuid()',
    description: 'random uuid',
  },
  {
    name: '$random.date()',
    description: 'Date format function',
  },
]);
