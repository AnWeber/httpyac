import { HttpResponse, ProcessedHttpRegion, TestResult, TestResultStatus } from '../../models';
import * as utils from '../../utils';
import { SendFilterOptions, SendOptions } from './options';
import { fileProvider } from '../../io';

export interface SendJsonOutput {
  _meta: {
    version: string;
  };
  summary: SendRequestSummary & SendTestSummary;
  requests: Array<SendOutputRequest>;
}

export interface SendOutputRequest {
  fileName: string;
  name: string;
  title?: string;
  description?: string;
  line?: number;
  summary: SendTestSummary;
  response?: HttpResponse;
  testResults?: Array<TestResult>;
  timestamp?: string;
  duration?: number;
}

export interface SendRequestSummary {
  totalRequests: number;
  skippedRequests: number;
  failedRequests: number;
  erroredRequests: number;
  successRequests: number;
}

export interface SendTestSummary {
  totalTests: number;
  failedTests: number;
  skippedTests: number;
  erroredTests: number;
  successTests: number;
}

function sum(x: number, y: number) {
  return x + y;
}

export function toSendJsonOutput(
  processedHttpRegions: Array<ProcessedHttpRegion>,
  options: SendOptions
): SendJsonOutput {
  const requests: Array<SendOutputRequest> = [];

  for (const httpRegion of processedHttpRegions) {
    let output = options.output;
    if (options.outputFailed && httpRegion.testResults?.some?.(test => !test.status)) {
      output = options.outputFailed;
    }
    const result: SendOutputRequest = {
      fileName: fileProvider.fsPath(httpRegion.filename) || fileProvider.toString(httpRegion.filename),
      response: convertResponse(httpRegion.response, output),
      name: utils.toString(httpRegion.metaData?.name) || httpRegion.symbol.name,
      line: httpRegion.symbol.startLine,
      title: utils.toString(httpRegion.metaData?.title),
      description: utils.toString(httpRegion.metaData?.description),
      testResults: httpRegion.testResults,
      timestamp: new Date(performance.timeOrigin + httpRegion.start).toISOString(),
      duration: httpRegion.duration,
      summary: {
        totalTests: httpRegion.testResults?.length || 0,
        failedTests: httpRegion.testResults?.filter?.(t => t.status === TestResultStatus.FAILED).length || 0,
        successTests: httpRegion.testResults?.filter?.(t => t.status === TestResultStatus.SUCCESS).length || 0,
        erroredTests: httpRegion.testResults?.filter?.(t => t.status === TestResultStatus.ERROR).length || 0,
        skippedTests: httpRegion.testResults?.filter?.(t => t.status === TestResultStatus.SKIPPED).length || 0,
      },
    };
    requests.push(result);
  }
  let resultRequests = requests;
  if (options.filter === SendFilterOptions.onlyFailed) {
    resultRequests = requests.filter(obj => obj.summary.failedTests > 0);
  }
  return {
    _meta: {
      version: '1.1.0',
    },
    requests: resultRequests,
    summary: createTestSummary(requests),
  };
}

export function createTestSummary(requests: Array<SendOutputRequest>): SendRequestSummary & SendTestSummary {
  return {
    totalRequests: requests.length,
    skippedRequests: requests.filter(obj => obj.summary.skippedTests > 0).length,
    failedRequests: requests.filter(obj => obj.summary.failedTests > 0).length,
    successRequests: requests.filter(
      obj => obj.summary.failedTests + obj.summary.erroredTests + obj.summary.skippedTests === 0
    ).length,
    erroredRequests: requests.filter(obj => obj.summary.erroredTests > 0).length,
    totalTests: requests.map(obj => obj.summary.totalTests).reduce(sum, 0),
    failedTests: requests.map(obj => obj.summary.failedTests).reduce(sum, 0),
    successTests: requests.map(obj => obj.summary.successTests).reduce(sum, 0),
    erroredTests: requests.map(obj => obj.summary.erroredTests).reduce(sum, 0),
    skippedTests: requests.map(obj => obj.summary.skippedTests).reduce(sum, 0),
  };
}

function convertResponse(response: HttpResponse | undefined, output: string | undefined) {
  if (response) {
    delete response.rawHeaders;
    delete response.rawBody;
    delete response.prettyPrintBody;
    delete response.parsedBody;
    delete response.contentType;
    delete response.tags;

    switch (output) {
      case 'body':
      case 'response':
        delete response.request;
        return response;
      case 'short':
        delete response.body;
        delete response.request;
        return response;
      case 'none':
        return undefined;
      case 'headers':
        delete response.body;
        delete response.request?.body;
        return response;
      case 'exchange':
      default:
        return response;
    }
  }
  return undefined;
}
