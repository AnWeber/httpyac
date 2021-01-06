import { EOL } from 'os';

export function toMultiLineString(lines: Array<string>) {
  return lines.join(EOL);
}

export function toMultiLineArray(text: string) {
  return text.split(EOL);
}

export function isString(text: any): text is string{
  return typeof  text === 'string';
}


export function isEmptyString(text: any): text is string {
  return typeof text === 'string' && /^(\s*)?$/.test(text);
}