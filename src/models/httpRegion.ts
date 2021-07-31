import { ExecuteHook } from './httpFileHooks';
import { HttpRequest } from './httpRequest';
import { HttpResponse } from './httpResponse';
import { HttpSymbol } from './httpSymbol';
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
    execute: ExecuteHook;
  }
}
