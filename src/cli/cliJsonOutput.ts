import { HttpRegion, HttpResponse, TestResult } from '../models';
import { CliOptions } from './cliOptions';


export interface CliJsonOutput {
  _meta: {
    version: string,
  },
  summary: CliRequestSummary & CliTestSummary,
  requests: Array<CliOutputRequest>
}
export interface CliOutputRequest {
  fileName: string;
  name?: string;
  line?: number;
  summary: CliTestSummary,
  response: HttpResponse | undefined,
  testResults?: Array<TestResult>
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
    requests.push(...httpRegions.map(httpRegion => ({
      fileName,
      response: convertResponse(httpRegion.response, options.output),
      name: httpRegion.metaData?.name,
      line: httpRegion.symbol.startLine,
      testResults: httpRegion.testResults,
      summary: {
        totalTests: httpRegion.testResults?.length || 0,
        failedTests: httpRegion.testResults?.filter?.(obj => !obj.result).length || 0,
        successTests: httpRegion.testResults?.filter?.(obj => !!obj.result).length || 0,
      }
    })));

  }
  return {
    _meta: {
      version: '0.1',
    },
    requests,
    summary: {
      totalRequests: requests.length,
      failedRequests: requests.filter(obj => obj.summary.failedTests > 0).length,
      successRequests: requests.filter(obj => obj.summary.failedTests === 0).length,
      totalTests: requests.map(obj => obj.summary.totalTests).reduce(sum, 0),
      failedTests: requests.map(obj => obj.summary.failedTests).reduce(sum, 0),
      successTests: requests.map(obj => obj.summary.successTests).reduce(sum, 0),
    }
  };
}


function convertResponse(response: HttpResponse | undefined, output: string | undefined) {
  if (response) {
    const clone: HttpResponse = {
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
      headers: response.headers,
      body: response.body,
      timings: response.timings,
      meta: response.meta,
    };
    if (response.request) {
      clone.request = {
        method: response.request.method,
        url: response.request.url,
        headers: response.request.headers,
        body: response.request.body,
      };
    }
    switch (output) {
      case 'body':
      case 'response':
        delete clone.request;
        return clone;
      case 'short':
        delete clone.body;
        delete clone.request;
        return clone;
      case 'none':
        return undefined;
      case 'headers':
        delete clone.body;
        delete clone.request?.body;
        return clone;
      case 'exchange':
      default:
        return clone;
    }
  }
  return undefined;
}
