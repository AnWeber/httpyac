import { chalkInstance, scriptConsole } from '../logger';
import { HttpRegion, TestResult } from '../models';
import * as utils from '../utils';

export const testSymbols = {
  ok: '✓',
  error: '✖',
};

export interface TestFunction{
  (message: string, testMethod: () => void): void;
  status(status: number): void;
  header(headerKey: string, val: string | string[] | null | undefined): void;
  headerContains(headerKey: string, val: string): void;
  responseBody(val: unknown): void;
  hasResponseBody(): void;
  hasNoResponseBody(): void;
}

export function testFactory(httpRegion: HttpRegion) : TestFunction {
  const testFunction = function test(message: string, testMethod: () => void): void {
    const chalk = chalkInstance();
    const testResult: TestResult = {
      message,
      result: true
    };
    if (!httpRegion.testResults) {
      httpRegion.testResults = [];
      scriptConsole.info(chalk`{bold Tests for ${utils.getRegionName(httpRegion)}}`);
    }
    httpRegion.testResults.push(testResult);
    if (typeof testMethod === 'function') {
      try {
        testMethod();
        scriptConsole.info(chalk`{green ${testSymbols.ok} ${message || 'Test passed'}}`);
      } catch (err) {
        process.exitCode = 20;
        testResult.result = false;
        testResult.error = utils.parseError(err);
        scriptConsole.error(chalk`{red ${testSymbols.error} ${message || 'Test failed'} (${testResult.error.displayMessage})}`);
      }
    }
  };

  testFunction.status = (status: number) => {
    if (httpRegion.response) {
      const response = httpRegion.response;
      testFunction(`response status equals to ${status}`, () => utils.assertStatusEquals(response, status));
    }
  };
  testFunction.header = (headerKey: string, val: string | string[] | null | undefined) => {
    if (httpRegion.response) {
      const response = httpRegion.response;
      testFunction(`response header equals ${val}`, () => utils.assertHeaderEquals(response, headerKey, val));
    }
  };
  testFunction.headerContains = (headerKey: string, val: string) => {
    if (httpRegion.response) {
      const response = httpRegion.response;
      testFunction(`response header contains ${val}`, () => utils.assertHeaderContains(response, headerKey, val));
    }
  };
  testFunction.responseBody = (val: unknown) => {
    if (httpRegion.response) {
      const response = httpRegion.response;
      testFunction(`response body equals ${val}`, () => utils.assertResponseBodyEquals(response, val));
    }
  };

  testFunction.hasResponseBody = () => {
    if (httpRegion.response) {
      const response = httpRegion.response;
      testFunction('response body exists', () => utils.assertHasResponseBody(response));
    }
  };
  testFunction.hasNoResponseBody = () => {
    if (httpRegion.response) {
      const response = httpRegion.response;
      testFunction('response body does not exists', () => utils.assertHasNoResponseBody(response));
    }
  };
  return testFunction;
}


export function testSummary(httpRegions: Array<HttpRegion>): { total: number; success: number; failed: number;} {
  const result = {
    total: 0,
    success: 0,
    failed: 0,
  };

  for (const httpRegion of httpRegions) {
    if (httpRegion.testResults) {
      result.total += httpRegion.testResults.length;
      result.success += httpRegion.testResults.filter(obj => obj.result).length;
      result.failed += httpRegion.testResults.filter(obj => !obj.result).length;
    }
  }
  return result;
}
