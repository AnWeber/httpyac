import { stateGenerator } from '../stringUtils';

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
