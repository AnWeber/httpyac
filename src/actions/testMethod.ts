import { ProcessorContext, TestFunction, TestResult } from '../models';
import * as utils from '../utils';


export function testFactory({ httpRegion, scriptConsole }: ProcessorContext): TestFunction {
  const testFunction = function test(message: string, testMethod: () => void): void {
    const chalk = utils.chalkInstance();
    const testResult: TestResult = {
      message,
      result: true
    };
    if (!httpRegion.testResults) {
      httpRegion.testResults = [];
      if (scriptConsole) {
        scriptConsole.debug(chalk`{bold Tests for ${utils.getRegionName(httpRegion)}}`);
      }
    }
    httpRegion.testResults.push(testResult);
    if (typeof testMethod === 'function') {
      try {
        testMethod();
      } catch (err) {
        process.exitCode = 20;
        testResult.result = false;
        testResult.error = utils.parseError(err);
      }
    }
  };

  testFunction.status = (status: number) => {
    if (httpRegion.response) {
      const response = httpRegion.response;
      testFunction(`response status equals to ${status}`, () => utils.assertStatusEquals(response, status));
    }
  };
  testFunction.totalTime = (maxTotalTime: number) => {
    if (httpRegion.response) {
      const response = httpRegion.response;
      testFunction(`total time exceeded ${maxTotalTime}`, () => utils.assertMaxTotalTime(response, maxTotalTime));
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
