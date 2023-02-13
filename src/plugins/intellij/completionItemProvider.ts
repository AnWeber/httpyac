import { completionItemProvider } from '../../io';

completionItemProvider.emptyLineProvider.push((text: string) => {
  const result = [
    {
      name: '{{$uuid',
      description: 'UUID',
    },
    {
      name: '{{$uuid',
      description: 'UUID',
    },
    {
      name: '{{$random.uuid',
      description: 'UUID',
    },
    {
      name: '{{$timestamp',
      description: 'Timestamp',
    },
    {
      name: '{{$isoTimestamp',
      description: 'ISOTimestamp',
    },
    {
      name: '{{$randomInt',
      description: 'randomInt (0 -1000)',
    },
    {
      name: '{{$random.integer',
      description: 'integer',
    },
    {
      name: '{{$random.float',
      description: 'float',
    },
    {
      name: '{{$random.alphabetic',
      description: 'Alphabetic Text',
    },
    {
      name: '{{$random.alphanumeric',
      description: 'Alphanumeric Text',
    },
    {
      name: '{{$random.hexadecimal',
      description: 'Hexadecimal String',
    },
    {
      name: '{{$random.email',
      description: 'EMail',
    },
  ];
  const index = text.lastIndexOf('{{');
  if (index >= 0) {
    return result.map(obj => ({
      ...obj,
      text: `${text}${obj.name.slice(text.length - index)}`,
    }));
  }
  return result;
});
