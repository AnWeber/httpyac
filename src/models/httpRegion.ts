import { SeriesHook } from './hook';
import { HttpRequest } from './httpRequest';
import { HttpResponse } from './httpResponse';
import { HttpSymbol } from './httpSymbol';
import { ProcessorContext } from './processorContext';
import { TestResult } from './testResult';

export interface ProcessedHttpRegion{
  request?: HttpRequest;
  response?: HttpResponse;
  requestLine?: number;
  metaData: Record<string, string | undefined>;
  testResults?: Array<TestResult>;
  responseRefs?: Array<string>;
}

export interface HttpRegion extends ProcessedHttpRegion{
  symbol: HttpSymbol;
  hooks: {
    execute: SeriesHook<ProcessorContext, boolean>;
  }
}
