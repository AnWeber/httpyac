import * as models from '../../../models';
import { restClientVariableReplacer } from './restClientVariableReplacer';

describe('restClientVariableReplacer', () => {
  it('should replace $guid', async () => {
    const result = await restClientVariableReplacer(
      `foo={{$guid}}`,
      'unittest',
      {} as unknown as models.ProcessorContext
    );
    expect(result).toMatch(/^foo=[0-9A-Fa-f]{8}(?:-[0-9A-Fa-f]{4}){3}-[0-9A-Fa-f]{12}$/iu);
  });
  it('should replace $randomInt', async () => {
    const result = await restClientVariableReplacer(
      `foo={{$randomInt 1 9}}`,
      'unittest',
      {} as unknown as models.ProcessorContext
    );
    expect(result).toMatch(/^foo=[0-9]$/iu);
  });
  it('should replace $processEnv', async () => {
    process.env.test = 'bar';
    const result = await restClientVariableReplacer(
      `foo={{$processEnv test}}`,
      'unittest',
      {} as unknown as models.ProcessorContext
    );
    expect(result).toBe('foo=bar');
  });
  it('should replace $dotenv', async () => {
    const result = await restClientVariableReplacer(`foo={{$dotenv test}}`, 'unittest', {
      variables: { test: 'bar' },
    } as unknown as models.ProcessorContext);
    expect(result).toBe('foo=bar');
  });
});
