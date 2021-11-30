/* eslint-disable @typescript-eslint/no-explicit-any */
import { provideConfigEnvironments, provideConfigVariables } from '@/variables/provider/configVariableProvider';

describe('configVariableProvider', () => {
  describe('provideConfigEnvironments', () => {
    it('should return only test', async () => {
      const result = await provideConfigEnvironments({
        config: {
          environments: { $shared: {}, $default: {}, test: {} },
        },
      } as any);
      expect(result).toEqual(['test']);
    });
  });
  describe('provideConfigVariables', () => {
    it('should return shared and test', async () => {
      const result = await provideConfigVariables(['test'], {
        config: {
          environments: { $shared: { isShared: true }, $default: { isDefault: true }, test: { isTest: true } },
        },
      } as any);
      expect(result).toEqual({ isShared: true, isTest: true });
    });
    it('undefined should return shared and default', async () => {
      const result = await provideConfigVariables(undefined, {
        config: {
          environments: { $shared: { isShared: true }, $default: { isDefault: true }, test: { isTest: true } },
        },
      } as any);
      expect(result).toEqual({ isShared: true, isDefault: true });
    });
    it('empty should return shared and default', async () => {
      const result = await provideConfigVariables([], {
        config: {
          environments: { $shared: { isShared: true }, $default: { isDefault: true }, test: { isTest: true } },
        },
      } as any);
      expect(result).toEqual({ isShared: true, isDefault: true });
    });
  });
});
