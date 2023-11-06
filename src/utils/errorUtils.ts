import { log } from '../io';
import { ErrorDescription } from '../models';
import { stringifySafe, toString } from './stringUtils';

export function isError(val: unknown): val is Error & { handled?: boolean } {
  if (!val) {
    return false;
  }
  if (val instanceof Error) {
    return true;
  }
  const err = val as Error;
  return !!err.message && !!err.stack && !!err.name;
}

export function parseError(err: Error): ErrorDescription {
  if (err.stack) {
    const match = /^(?<error>.*):\s*(?<message>.*)\r?\n\s*at (?<file>.*):(?<line>\d*):(?<offset>\d*)/mu.exec(err.stack);

    if (match && match.groups?.error) {
      return {
        error: err,
        errorType: match.groups.error,
        message: match.groups.message,
        file: match.groups.file,
        line: match.groups.line,
        offset: match.groups.offset,
        displayMessage: `${match.groups.error}: ${match.groups.message} - ${match.groups.file}:${match.groups.line}:${match.groups.offset}`,
      };
    }
  }
  return {
    error: err,
    displayMessage: err.message,
  };
}

export function errorToString(err: unknown): string | undefined {
  if (isError(err)) {
    return stringifySafe({
      message: err.message,
      name: err.name,
      stack: err.stack,
    });
  }
  return toString(err);
}

export async function useDefaultOnError<T>(promise: Promise<T>, defaultVal: T): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    log.warn(`promise has read error`, err);
    return defaultVal;
  }
}
