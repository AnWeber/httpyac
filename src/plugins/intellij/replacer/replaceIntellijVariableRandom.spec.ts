import { replaceIntellijVariableRandom } from './replaceIntellijVariableRandom';

describe('replaceIntellijVariableRandom', () => {
  it('should return uuid', () => {
    const result = replaceIntellijVariableRandom('$uuid');
    expect(result).toMatch(/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/u);
  });
  it('should return $random.uuid', () => {
    const result = replaceIntellijVariableRandom('$random.uuid');
    expect(result).toMatch(/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/u);
  });
  it('should return $timestamp', () => {
    const result = replaceIntellijVariableRandom('$timestamp');
    expect(result).toMatch(/^[0-9]{13}$/u);
  });
  it('should return $isoTimestamp', () => {
    const result = replaceIntellijVariableRandom('$isoTimestamp');
    expect(result).toMatch(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d\d\dZ/u);
  });
  it('should return $randomInt', () => {
    const result = replaceIntellijVariableRandom('$randomInt');
    expect(Number.isInteger(Number(result))).toBe(true);
  });
  it('should return $random.integer', () => {
    const result = Number(replaceIntellijVariableRandom('$random.integer(0,10)'));
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(10);
  });
  it('should return $random.float', () => {
    const result = replaceIntellijVariableRandom('$random.float(0,10)');
    expect(result).toMatch(/^\d*\.\d*$/u);
  });
  it('should return $random.alphabetic', () => {
    const result = replaceIntellijVariableRandom('$random.alphabetic(10)');
    expect(result).toMatch(/^[a-zA-Z]*$/u);
    expect(result?.length).toBe(10);
  });
  it('should return $random.alphanumeric', () => {
    const result = replaceIntellijVariableRandom('$random.alphanumeric(10)');
    expect(result?.length).toBe(10);
    expect(result).toMatch(/^[0-9a-zA-Z]*$/u);
  });
  it('should return $random.alphanumeric', () => {
    const result = replaceIntellijVariableRandom('$random.alphanumeric(10)');
    expect(result?.length).toBe(10);
    expect(result).toMatch(/^[0-9a-zA-Z]*$/u);
  });
  it('should return $random.email', () => {
    const result = replaceIntellijVariableRandom('$random.email()');
    expect(result).toMatch(/^[\w]+@[\w-]+\.[\w]{2,4}$/u);
  });
  it('should return $random.hexadecimal', () => {
    const result = replaceIntellijVariableRandom('$random.hexadecimal(10)');
    expect(result?.length).toBe(10);
    expect(result).toMatch(/^[0-9a-fA-F]{10}$/u);
  });
  it('should return undefined', () => {
    const result = replaceIntellijVariableRandom('$random.foo');
    expect(result).toBeUndefined();
  });
});
