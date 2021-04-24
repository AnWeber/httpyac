import { chalkInstance, scriptConsole } from '../logger';
import { HttpRegion, TestResult } from '../models';
import { getRegionName, parseError } from '../utils';

export const testSymbols = {
  ok: '✓',
  error: '✖',
};

export function testFactory(httpRegion: HttpRegion) {
  return function test(message: string, testMethod: () => void): void {
    const chalk = chalkInstance();
    const testResult: TestResult = {
      message,
      result: true
    };
    if (!httpRegion.testResults) {
      httpRegion.testResults = [];
      scriptConsole.info(chalk`{bold Tests for ${getRegionName(httpRegion)}}`);
    }
    httpRegion.testResults.push(testResult);
    if (typeof testMethod === 'function') {
      try {
        testMethod();
        scriptConsole.info(chalk`{green ${testSymbols.ok} ${message || 'Test passed'}}`);
      } catch (err) {
        process.exitCode = 20;
        testResult.result = false;
        testResult.error = parseError(err);
        scriptConsole.error(chalk`{red ${testSymbols.error} ${message || 'Test failed'} (${testResult.error.displayMessage})}`);
      }
    }
  };
}
