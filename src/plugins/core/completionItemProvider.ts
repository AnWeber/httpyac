import { completionItemProvider } from '../../io';

completionItemProvider.variableProvider.push(() => [
  {
    name: '$prompt ',
    description: 'Prompt',
  },
  {
    name: '$input',
    description: 'Input',
  },
  {
    name: '$input-askonce',
    description: 'Input',
  },
  {
    name: '$password',
    description: 'Password',
  },
  {
    name: '$pick <placeholder> $value:',
    description: 'Password',
  },
  {
    name: '$pick-askonce <placeholder> $value:',
    description: 'Password',
  },
  {
    name: '$timestamp',
    description: 'Timestamp',
  },
  {
    name: '$datetime',
    description: 'Datetime',
  },
  {
    name: '$localDatetime',
    description: 'Local Datetime',
  },
]);
