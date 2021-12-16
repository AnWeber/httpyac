import {
  provideConfigEnvironments,
  provideConfigVariables,
} from '../../../src/variables/provider/configVariableProvider';
import * as models from '@/models';

describe('configVariableProvider', () => {
  describe('provideConfigEnvironments', () => {
    it('should return only test', async () => {
      const result = await provideConfigEnvironments({
        config: {
          environments: { $shared: {}, $default: {}, test: {} },
        },
      } as unknown as models.VariableProviderContext);
      expect(result).toEqual(['test']);
    });
  });
  describe('provideConfigVariables', () => {
    it('should return shared and test', async () => {
      const result = await provideConfigVariables(['test'], {
        config: {
          environments: { $shared: { isShared: true }, $default: { isDefault: true }, test: { isTest: true } },
        },
      } as unknown as models.VariableProviderContext);
      expect(result).toEqual({ isShared: true, isTest: true });
    });
    it('undefined should return shared and default', async () => {
      const result = await provideConfigVariables(undefined, {
        config: {
          environments: { $shared: { isShared: true }, $default: { isDefault: true }, test: { isTest: true } },
        },
      } as unknown as models.VariableProviderContext);
      expect(result).toEqual({ isShared: true, isDefault: true });
    });
    it('empty should return shared and default', async () => {
      const result = await provideConfigVariables([], {
        config: {
          environments: { $shared: { isShared: true }, $default: { isDefault: true }, test: { isTest: true } },
        },
      } as unknown as models.VariableProviderContext);
      expect(result).toEqual({ isShared: true, isDefault: true });
    });
  });
});
