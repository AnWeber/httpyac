import { ensureString } from './stringUtils';

export function toNumber<T>(value: unknown, defaultValue: T | undefined = undefined): number | T | undefined {
  if (typeof value === 'number') {
    return value;
  }
  const stringValue = ensureString(value);
  if (stringValue) {
    const numberValue = Number.parseInt(stringValue.trim(), 10);
    if (!isNaN(numberValue)) {
      return numberValue;
    }
  }
  return defaultValue;
}
