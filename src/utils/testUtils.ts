import { HttpRegion, HttpResponse, ProcessorContext, TestFunction, TestResult, TestResultStatus } from '../models';
import {
  assertHasNoResponseBody,
  assertHasResponseBody,
  assertHeaderContains,
  assertHeaderEquals,
  assertMaxTotalTime,
  assertResponseBodyEquals,
  assertStatusEquals,
} from './assertUtils';
import { isError, parseError } from './errorUtils';
import { isHttpResponse } from './requestUtils';

export type TestFactoryOptions = {
  ignoreErrorFile: true;
};

export function testFactoryAsync(
  { httpRegion }: ProcessorContext,
  options: TestFactoryOptions
): (message: string, testMethod: (testResult: TestResult) => Promise<void>) => Promise<void> {
  return async function test(
    message: string,
    testMethod: (testResult: TestResult) => Promise<void> | void
  ): Promise<void> {
    const testResult: TestResult = {
      message,
      status: TestResultStatus.SUCCESS,
    };
    if (typeof testMethod === 'function') {
      try {
        await testMethod(testResult);
      } catch (err) {
        setErrorInTestResult(testResult, err);
        if (options.ignoreErrorFile && testResult.error?.errorType) {
          testResult.error.displayMessage = `${testResult.error.errorType}: ${testResult.error.message}`;
        }
      }
    }
    addTestResultToHttpRegion(httpRegion, testResult);
  };
}

function setErrorInTestResult(testResult: TestResult, err: unknown) {
  testResult.status = TestResultStatus.FAILED;
  if (isError(err)) {
    testResult.error = parseError(err);
  } else {
    testResult.error = {
      displayMessage: `${err}`,
      error: new Error(`${err}`),
    };
  }
}

export function testFactory({ httpRegion, variables }: ProcessorContext): TestFunction {
  const testFunction = function test(message: string, testMethod: () => void): void {
    const testResult: TestResult = {
      message,
      status: TestResultStatus.SUCCESS,
    };
    if (typeof testMethod === 'function') {
      try {
        testMethod();
      } catch (err) {
        setErrorInTestResult(testResult, err);
      }
    }
    addTestResultToHttpRegion(httpRegion, testResult);
  };

  function getHttpResponse(): HttpResponse | undefined {
    if (isHttpResponse(variables.response)) {
      return variables.response;
    }
    return httpRegion.response;
  }

  testFunction.status = (status: number) => {
    const response = getHttpResponse();
    if (response) {
      testFunction(`response status equals to ${status}`, () => assertStatusEquals(response, status));
    }
  };
  testFunction.totalTime = (maxTotalTime: number) => {
    const response = getHttpResponse();
    if (response) {
      testFunction(`total time exceeded ${maxTotalTime}`, () => assertMaxTotalTime(response, maxTotalTime));
    }
  };
  testFunction.header = (headerKey: string, val: string | string[] | undefined) => {
    const response = getHttpResponse();
    if (response) {
      testFunction(`response header ${headerKey} equals ${val}`, () => assertHeaderEquals(response, headerKey, val));
    }
  };
  testFunction.headerContains = (headerKey: string, val: string) => {
    const response = getHttpResponse();
    if (response) {
      testFunction(`response header ${headerKey} contains ${val}`, () =>
        assertHeaderContains(response, headerKey, val)
      );
    }
  };
  testFunction.responseBody = (val: unknown) => {
    const response = getHttpResponse();
    if (response) {
      testFunction(`response body equals ${val}`, () => assertResponseBodyEquals(response, val));
    }
  };

  testFunction.hasResponseBody = () => {
    const response = getHttpResponse();
    if (response) {
      testFunction('response body exists', () => assertHasResponseBody(response));
    }
  };
  testFunction.hasNoResponseBody = () => {
    const response = getHttpResponse();
    if (response) {
      testFunction('response body does not exists', () => assertHasNoResponseBody(response));
    }
  };
  return testFunction;
}
export function addTestResultToHttpRegion(httpRegion: HttpRegion, testResult: TestResult) {
  if (!httpRegion.testResults) {
    httpRegion.testResults = [];
  }
  httpRegion.testResults.push(testResult);
}

export function addSkippedTestResult(httpRegion: HttpRegion, message: string = 'request is skipped') {
  addTestResultToHttpRegion(httpRegion, {
    message,
    status: TestResultStatus.SKIPPED,
  });
}
