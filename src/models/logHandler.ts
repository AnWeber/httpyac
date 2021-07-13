import { HttpResponse } from './httpResponse';
import { TestResult } from './testResult';

export interface LogHandler {
  info(...params: unknown[]): void;
  log(...params: unknown[]): void;
  trace(...params: unknown[]): void;
  debug(...params: unknown[]): void;
  error(...params: unknown[]): void;
  warn(...params: unknown[]): void;
  clear(): void;
}


export type RequestLogger = (response: HttpResponse, testResults?: Array<TestResult>) => void;
