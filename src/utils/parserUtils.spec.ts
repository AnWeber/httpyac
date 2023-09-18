import { ParserContext } from '@/models';

import { parseRequestHeaderFactory } from './parserUtils';

describe('http header test', () => {
  it('is valid header', async () => {
    const tests: Array<{ value: string; valid: boolean }> = [
      {
        value: 'Authorization: oauth2',
        valid: true,
      },
      {
        value: 'EmptyTest:',
        valid: true,
      },
      {
        value: 'X-Forwarded-Host: foobar',
        valid: true,
      },
      {
        value: 'foo.bar: foobar',
        valid: true,
      },
      {
        value: 'X-Forwarded-Host',
        valid: false,
      },
      {
        value: '...defaults',
        valid: false,
      },
    ];

    for (const test of tests) {
      const parseHeaders = parseRequestHeaderFactory({});
      const match = await parseHeaders(
        {
          line: 0,
          textLine: test.value,
        },
        {} as ParserContext
      );
      if (test.valid) {
        expect(match).toBeDefined();
      } else {
        expect(match).toBeFalsy();
      }
    }
  });
});
