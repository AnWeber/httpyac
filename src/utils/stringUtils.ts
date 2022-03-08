import { fileProvider } from '../io';
import { createHash } from 'crypto';

export function toMultiLineString(lines: Array<string>): string {
  return lines.join(fileProvider.EOL);
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
  // unreserved characters according to RFC 3986
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-._~';
  const result = [];
  for (let i = length; i > 0; --i) {
    result.push(chars[Math.floor(Math.random() * chars.length)]);
  }
  return result.join('');
}

export function createSha256(data: string): string {
  return createHash('sha256').update(data, 'ascii').digest('base64url');
}

export function toString(value: unknown): string | undefined {
  if (isString(value) || typeof value === 'number') {
    return `${value}`;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('utf-8');
  }
  if (Array.isArray(value) && value.every(obj => Buffer.isBuffer(obj))) {
    const jsonData = value.map(obj => Buffer.isBuffer(obj) && obj.toString('utf8'));
    return JSON.stringify(jsonData, null, 2);
  }
  if (value) {
    return JSON.stringify(value);
  }
  return undefined;
}
