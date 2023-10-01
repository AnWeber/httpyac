import { completionItemProvider } from '../../io';

completionItemProvider.variableProvider.push(() => [
  {
    name: '$uuid',
    description: 'UUID',
  },
  {
    name: '$uuid',
    description: 'UUID',
  },
  {
    name: '$random.uuid',
    description: 'UUID',
  },
  {
    name: '$timestamp',
    description: 'Timestamp',
  },
  {
    name: '$isoTimestamp',
    description: 'ISOTimestamp',
  },
  {
    name: '$randomInt',
    description: 'randomInt (0 -1000)',
  },
  {
    name: '$random.integer',
    description: 'integer',
  },
  {
    name: '$random.float',
    description: 'float',
  },
  {
    name: '$random.alphabetic',
    description: 'Alphabetic Text',
  },
  {
    name: '$random.alphanumeric',
    description: 'Alphanumeric Text',
  },
  {
    name: '$random.hexadecimal',
    description: 'Hexadecimal String',
  },
  {
    name: '$random.email',
    description: 'EMail',
  },
]);
