import { ensureString, toString } from './stringUtils';

export function toBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return !!value;
  const stringValue = ensureString(value)?.trim();
  if (!stringValue) {
    return defaultValue;
  }
  if (/^true$/iu.test(stringValue)) {
    return true;
  }
  if (/^false$/iu.test(stringValue)) {
    return false;
  }
  const numberValue = parseFloat(stringValue);
  if (isNaN(numberValue)) {
    return defaultValue;
  }
  return !!numberValue;
}
export function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }
  const stringValue = ensureString(value);
  if (stringValue) {
    const numberValue = Number.parseFloat(stringValue.trim());
    if (!Number.isNaN(numberValue)) {
      return numberValue;
    }
  }
  return undefined;
}

export function toBufferLike(value: unknown): Buffer | string | undefined {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  return toString(value);
}
