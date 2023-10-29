import { default as chalk } from 'chalk';

import {
  ConsoleLogHandler,
  HttpRegion,
  HttpResponse,
  ProcessorContext,
  TestFunction,
  TestResult,
  testSymbols,
} from '../models';
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

export function testFactoryAsync({
  httpRegion,
  scriptConsole,
}: ProcessorContext): (message: string, testMethod: () => Promise<void>) => Promise<void> {
  return async function test(message: string, testMethod: () => Promise<void> | void): Promise<void> {
    const testResult: TestResult = {
      message,
      result: true,
    };
    if (typeof testMethod === 'function') {
      try {
        await testMethod();
      } catch (err) {
        setErrorInTestResult(testResult, err);
      }
    }
    addTestResultToHttpRegion(httpRegion, testResult, scriptConsole);
  };
}

function setErrorInTestResult(testResult: TestResult, err: unknown) {
  testResult.result = false;
  if (isError(err)) {
    testResult.error = parseError(err);
  } else {
    testResult.error = {
      displayMessage: `${err}`,
      error: new Error(`${err}`),
    };
  }
}

export function testFactory({ httpRegion, scriptConsole, variables }: ProcessorContext): TestFunction {
  const testFunction = function test(message: string, testMethod: () => void): void {
    const testResult: TestResult = {
      message,
      result: true,
    };
    if (typeof testMethod === 'function') {
      try {
        testMethod();
      } catch (err) {
        setErrorInTestResult(testResult, err);
      }
    }
    addTestResultToHttpRegion(httpRegion, testResult, scriptConsole);
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
function addTestResultToHttpRegion(
  httpRegion: HttpRegion,
  testResult: TestResult,
  scriptConsole: ConsoleLogHandler | undefined
) {
  if (!httpRegion.testResults) {
    httpRegion.testResults = [];
  }
  httpRegion.testResults.push(testResult);

  scriptConsole?.logTest?.(
    testResult.result,
    testResult.result
      ? chalk`{green ${testSymbols.ok} ${testResult.message || 'Test passed'}}`
      : chalk`{red ${testSymbols.error} ${testResult.message || 'Test failed'} (${testResult.error?.displayMessage})}`
  );
}
