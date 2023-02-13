import { completionItemProvider } from '../../io';

completionItemProvider.emptyLineProvider.push(() => [
  {
    name: '?? status == ',
    description: 'Status assert (200)',
  },
  {
    name: '?? status == 200',
    description: 'Status assert (200)',
  },
  {
    name: '?? duration <',
    description: 'Duration assert',
  },
  {
    name: '?? body contains',
    description: 'Body assert',
  },
  {
    name: '?? body matches',
    description: 'Body assert',
  },
  {
    name: '?? body md5',
    description: 'Body assert',
  },
  {
    name: '?? body sh256',
    description: 'Body assert',
  },
  {
    name: '?? header',
    description: 'Header assert',
  },
]);
