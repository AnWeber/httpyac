import { EOL } from 'os';

export function toMultiLineString(lines: Array<string>): string {
  return lines.join(EOL);
}

export function toMultiLineArray(text: string): Array<string> {
  return text.split(/\r?\n/gu);
}

export function isString(text: unknown): text is string {
  return typeof text === 'string';
}

export function toNumber<T>(text: string | undefined, defaultVal?: T | undefined): number | T | undefined {
  if (text) {
    const number = Number.parseInt(text, 10);
    if (!Number.isNaN(number)) {
      return number;
    }
  }
  return defaultVal;
}

export function isStringEmpty(text: unknown): boolean {
  return typeof text === 'string' && /^(\s*)?$/u.test(text);
}

export function stateGenerator(length = 30): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const result = [];
  for (let i = length; i > 0; --i) {
    result.push(chars[Math.floor(Math.random() * chars.length)]);
  }
  return result.join('');
}
