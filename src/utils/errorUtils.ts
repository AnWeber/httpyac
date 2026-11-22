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
    const match = /^(?<error>.*?):\s*(?<message>.*)\r?\n\s*at (?<file>.*):(?<line>\d*):(?<offset>\d*)/mu.exec(err.stack);

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

/**
 * returns a descriptive message of an error. Falls back to the messages of inner errors (e.g. AggregateError of net.connect
 * with autoSelectFamily, which has an empty message) and to the error code
 */
export function getErrorMessage(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') {
    return undefined;
  }
  const error = err as { message?: unknown; errors?: unknown; code?: unknown };
  if (typeof error.message === 'string' && error.message) {
    return error.message;
  }
  if (Array.isArray(error.errors)) {
    const message = error.errors
      .map(getErrorMessage)
      .filter(obj => !!obj)
      .join(', ');
    if (message) {
      return message;
    }
  }
  if (typeof error.code === 'string' && error.code) {
    return error.code;
  }
  return undefined;
}

/**
 * sets message of error, if message is empty, and updates stack accordingly
 */
export function ensureErrorMessage(err: Error, innerError?: unknown) {
  if (err.message) {
    return;
  }
  const message = getErrorMessage(innerError) || getErrorMessage(err);
  if (message) {
    err.message = message;
    if (err.stack) {
      const lines = err.stack.split('\n');
      lines[0] = `${err.name}: ${message}`;
      err.stack = lines.join('\n');
    }
  }
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
