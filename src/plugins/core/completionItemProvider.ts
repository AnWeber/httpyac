import { completionItemProvider } from '../../io';

completionItemProvider.emptyLineProvider.push((text: string) => {
  const result = [
    {
      name: '{{$prompt ',
      description: 'Prompt',
    },
    {
      name: '{{$input',
      description: 'Input',
    },
    {
      name: '{{$password',
      description: 'Password',
    },
    {
      name: '{{$pick <placeholder> $value:',
      description: 'Password',
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
