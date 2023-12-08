import * as models from '../../../models';
import { escapeVariableInterceptor } from './escapeVariableReplacer';
import { HookTriggerContext } from 'hookpoint';

describe('escapeVariableReplacer', () => {
  const escape = (val: string) => {
    const context = {
      args: [val],
      results: [],
    } as unknown as HookTriggerContext<[unknown, string, models.ProcessorContext], unknown>;
    escapeVariableInterceptor.afterLoop(context);
    return context.results.length > 0 ? context.results[0] : undefined;
  };
  it('returns escaped value', () => {
    // eslint-disable-next-line no-useless-escape
    expect(escape(String.raw`\{\{1\}\} - \{\{2\}\} - \{\{3\}\}`)).toBe('{{1}} - {{2}} - {{3}}');
  });
  it('returns same value', () => {
    expect(escape('foo {{ asdf } asdf')).toBeUndefined();
  });
});
