import { HttpRegion, HttpResponse, TestResult } from '../models';
import { CliFilterOptions, CliOptions } from './cliOptions';

export interface CliJsonOutput {
  _meta: {
    version: string;
  };
  summary: CliRequestSummary & CliTestSummary;
  requests: Array<CliOutputRequest>;
}

export interface CliOutputRequest {
  fileName: string;
  name?: string;
  title?: string;
  description?: string;
  line?: number;
  summary: CliTestSummary;
  response: HttpResponse | undefined;
  testResults?: Array<TestResult>;
}

export interface CliRequestSummary {
  totalRequests: number;
  failedRequests: number;
  successRequests: number;
}

export interface CliTestSummary {
  totalTests: number;
  failedTests: number;
  successTests: number;
}

function sum(x: number, y: number) {
  return x + y;
}

export function toCliJsonOutput(context: Record<string, Array<HttpRegion>>, options: CliOptions): CliJsonOutput {
  const requests: Array<CliOutputRequest> = [];
  for (const [fileName, httpRegions] of Object.entries(context)) {
    requests.push(
      ...httpRegions.map(httpRegion => {
        let output = options.output;
        if (options.outputFailed && httpRegion.testResults?.some?.(test => !test.result)) {
          output = options.outputFailed;
        }
        const result: CliOutputRequest = {
          fileName,
          response: convertResponse(httpRegion.response, output),
          name: httpRegion.metaData?.name,
          title: httpRegion.metaData?.title,
          description: httpRegion.metaData?.description,
          line: httpRegion.symbol.startLine,
          testResults: httpRegion.testResults,
          summary: {
            totalTests: httpRegion.testResults?.length || 0,
            failedTests: httpRegion.testResults?.filter?.(obj => !obj.result).length || 0,
            successTests: httpRegion.testResults?.filter?.(obj => !!obj.result).length || 0,
          },
        };
        return result;
      })
    );
  }
  let resultRequests = requests;
  if (options.filter === CliFilterOptions.onlyFailed) {
    resultRequests = requests.filter(obj => obj.summary.failedTests > 0);
  }
  return {
    _meta: {
      version: '1.0.0',
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
    delete response.rawBody;
    delete response.prettyPrintBody;
    delete response.parsedBody;
    delete response.contentType;

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
