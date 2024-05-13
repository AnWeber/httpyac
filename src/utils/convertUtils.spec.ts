import { toBoolean, toNumber, toBufferLike } from './convertUtils';

describe('convertUtils', () => {
  describe('toBoolean', () => {
    const tests = [
      {
        value: true,
        expected: true,
      },
      {
        value: false,
        expected: false,
      },
      {
        value: 'true',
        expected: true,
      },
      {
        value: 'false',
        expected: false,
      },
      {
        value: 0,
        expected: false,
      },
      {
        value: 1,
        expected: true,
      },
      {
        value: 'foo',
        expected: false,
      },
    ];
    for (const test of tests) {
      it(`toBoolean returns ${test.expected} for ${test.value}`, () => {
        expect(toBoolean(test.value)).toBe(test.expected);
      });
    }
  });
  describe('toNumber', () => {
    const tests = [
      {
        value: 1.2,
        expected: 1.2,
      },
      {
        value: '1.2',
        expected: 1.2,
      },
      {
        value: 'true',
        expected: undefined,
      },
    ];
    for (const test of tests) {
      it(`toNumber returns ${test.expected} for ${test.value}`, () => {
        expect(toNumber(test.value)).toBe(test.expected);
      });
    }
  });
  describe('toBufferLike', () => {
    it(`toBufferLike returns Buffer`, () => {
      expect(toBufferLike(Buffer.from('aasfd'))).toBeInstanceOf(Buffer);
    });
    it(`toBufferLike returns string`, () => {
      expect(toBufferLike('foo')).toBe('foo');
    });
  });
});
