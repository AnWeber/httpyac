import { ensureErrorMessage, getErrorMessage, parseError } from './errorUtils';

function createAggregateError() {
  const error = new AggregateError(
    [new Error('connect ECONNREFUSED ::1:9'), new Error('connect ECONNREFUSED 127.0.0.1:9')],
    ''
  ) as AggregateError & { code?: string };
  error.code = 'ECONNREFUSED';
  return error;
}

describe('getErrorMessage', () => {
  it('returns message of error', () => {
    expect(getErrorMessage(new Error('foo'))).toBe('foo');
  });

  it('returns joined messages of inner errors on empty message', () => {
    expect(getErrorMessage(createAggregateError())).toBe(
      'connect ECONNREFUSED ::1:9, connect ECONNREFUSED 127.0.0.1:9'
    );
  });

  it('returns code on empty message without inner errors', () => {
    const error = new Error('') as Error & { code?: string };
    error.code = 'ECONNREFUSED';
    expect(getErrorMessage(error)).toBe('ECONNREFUSED');
  });

  it('returns undefined for non errors', () => {
    expect(getErrorMessage(undefined)).toBeUndefined();
    expect(getErrorMessage('foo')).toBeUndefined();
  });
});

describe('ensureErrorMessage', () => {
  it('keeps existing message', () => {
    const error = new Error('foo');
    ensureErrorMessage(error, createAggregateError());
    expect(error.message).toBe('foo');
  });

  it('sets message and stack from inner error', () => {
    const error = new Error('');
    error.name = 'RequestError';
    error.stack =
      'RequestError\n    at ClientRequest.<anonymous> (index.js:970:111)\n    at Object.onceWrapper (node:events:634:26)';
    ensureErrorMessage(error, createAggregateError());

    const message = 'connect ECONNREFUSED ::1:9, connect ECONNREFUSED 127.0.0.1:9';
    expect(error.message).toBe(message);
    expect(error.stack.split('\n')[0]).toBe(`RequestError: ${message}`);
    expect(parseError(error).message).toBe(message);
  });
});
