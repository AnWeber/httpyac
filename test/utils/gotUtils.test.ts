import { mergeRawHttpHeaders } from '../../src/utils/gotUtils';

describe('Raw HTTP Header merge utils', () => {
  it('merges example raw headers to expected record value', () => {
    // Example taken from got documentation of the rawHeaders property of the Response type
    const rawHeaders = [
      'user-agent',
      'this is invalid because there can be only one',
      'User-Agent',
      'curl/7.22.0',
      'Host',
      '127.0.0.1:8000',
      'ACCEPT',
      '*',
    ];
    const mergedHeaders = mergeRawHttpHeaders(rawHeaders);
    // Note User-Agent header with different casing collapsed into a single multi-item string-array
    expect(mergedHeaders['user-agent']).toEqual(['this is invalid because there can be only one', 'curl/7.22.0']);
    // Headers that only appear once are stored in single-item string-arrays
    expect(mergedHeaders.host).toEqual(['127.0.0.1:8000']);
    expect(mergedHeaders.accept).toEqual(['*']);
  });
});
