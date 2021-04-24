import { HttpRegionAction } from './httpRegionAction';
import { HttpRequest } from './httpRequest';
import { HttpResponse } from './httpResponse';
import { HttpSymbol } from './httpSymbol';
import { TestResult } from './testResult';


export interface HttpRegion{
  actions: Array<HttpRegionAction>;
  request?: HttpRequest;
  response?: HttpResponse;
  requestLine?: number;
  source?: string;
  metaData: Record<string, string>;
  symbol: HttpSymbol;
  testResults?: Array<TestResult>;
}
