import { HttpResponse } from './httpResponse';
import { HttpSymbol } from './httpSymbol';
import { TestResult } from './testResult';
import { PathLike } from './pathLike';
import { Request } from './httpRequest';

export interface ProcessedHttpRegion {
  readonly id: string;
  readonly filename: PathLike;
  readonly symbol: HttpSymbol;
  readonly isGlobal: boolean;

  request?: Request;
  response?: HttpResponse;
  metaData?: Record<string, string | undefined | true>;
  testResults?: Array<TestResult>;
  start: number;
  end?: number;
  /** duration in millis */
  duration?: number;
  /** httpRegion is disabled */
  disabled?: boolean;
}
