import { EOL } from 'os';

export function toMultiLineString(lines: Array<string>) {
  return lines.join(EOL);
}

export function toMultiLineArray(text: string) {
  return text.split(/\r?\n/g);
}

export function isString(text: any): text is string{
  return typeof  text === 'string';
}


export function isStringEmpty(text: any) {
  return typeof text === 'string' && /^(\s*)?$/.test(text);
}

export function stateGenerator(length: number = 30) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const result = [];
  for (var i = length; i > 0; --i){
    result.push(chars[Math.floor(Math.random() * chars.length)]);
  }
  return result.join('');
}