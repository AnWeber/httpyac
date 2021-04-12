import { chalkInstance, scriptConsole } from '../logger';
import { parseError } from '../utils';

export const testSymbols = {
  ok: '✓',
  error: '✖',
};


export function test(message: string, testMethod: () => void): void {
  const chalk = chalkInstance();
  if (typeof testMethod === 'function') {
    try {
      testMethod();
      scriptConsole.info(chalk`{green ${testSymbols.ok} ${message || 'Test passed'}}`);
    } catch (err) {
      process.exitCode = 20;
      const description = parseError(err);
      if (description) {
        scriptConsole.error(chalk`{red ${testSymbols.error} ${message || 'Test failed'} (${description.file}:${description.line}:${description.offset})}`);
      } else {
        scriptConsole.error(chalk`{red ${testSymbols.error} ${message || err.message || 'Test failed'}}`);
      }
    }
  }
}