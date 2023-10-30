import { HttpResponse, ProcessedHttpRegion, TestResult } from '../../models';
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
  response: HttpResponse | undefined;
  testResults?: Array<TestResult>;
  duration?: number;
  disabled: boolean;
}

export interface SendRequestSummary {
  totalRequests: number;
  failedRequests: number;
  successRequests: number;
}

export interface SendTestSummary {
  totalTests: number;
  failedTests: number;
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
    if (options.outputFailed && httpRegion.testResults?.some?.(test => !test.result)) {
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
      duration: httpRegion.duration,
      disabled: !!httpRegion.disabled,
      summary: {
        totalTests: httpRegion.testResults?.length || 0,
        failedTests: httpRegion.testResults?.filter?.(obj => !obj.result).length || 0,
        successTests: httpRegion.testResults?.filter?.(obj => !!obj.result).length || 0,
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
    summary: {
      totalRequests: requests.length,
      failedRequests: requests.filter(obj => obj.summary.failedTests > 0).length,
      successRequests: requests.filter(obj => obj.summary.failedTests === 0).length,
      totalTests: requests.map(obj => obj.summary.totalTests).reduce(sum, 0),
      failedTests: requests.map(obj => obj.summary.failedTests).reduce(sum, 0),
      successTests: requests.map(obj => obj.summary.successTests).reduce(sum, 0),
    },
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
