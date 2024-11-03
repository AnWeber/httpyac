import { stateGenerator, stringifySafe } from './stringUtils';

describe('state generator', () => {
  it('generates strings of the expected length', () => {
    const result = stateGenerator(97);
    expect(result).toHaveLength(97);
  });

  it('generates only url safe chars', () => {
    const result = stateGenerator(64);
    const encoded = encodeURIComponent(result);
    expect(encoded).toBe(result);
  });
});

describe('stringifySafe', () => {
  it('should return json representation', () => {
    expect(
      stringifySafe({
        foo: 'bar',
        foo2: 2,
        foo3: true,
      })
    ).toEqual('{"foo":"bar","foo2":2,"foo3":true}');
  });
  it('should convert buffer to base64', () => {
    expect(
      stringifySafe({
        value: Buffer.from('\n\x17outbound|3000||test0629'),
      })
    ).toEqual('{"value":"ChdvdXRib3VuZHwzMDAwfHx0ZXN0MDYyOQ=="}');
  });
  it('should return base64 for buffer object', () => {
    expect(stringifySafe(Buffer.from('\n\x17outbound|3000||test0629'))).toEqual(
      '"ChdvdXRib3VuZHwzMDAwfHx0ZXN0MDYyOQ=="'
    );
  });
  it('should handle circular object', () => {
    const foo: Record<string, unknown> = {
      foo: 'foo',
    };
    const bar: Record<string, unknown> = {
      bar: 'bar',
      foo,
    };
    foo.bar = bar;
    expect(stringifySafe(foo)).toEqual('{"foo":"foo","bar":{"bar":"bar"}}');
  });
});
