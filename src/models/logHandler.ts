import { HttpRegion } from './httpRegion';
import { HttpResponse } from './httpResponse';
import { TestResult } from './testResult';

export interface LogHandler {

  info(...params: unknown[]): void;
  log(...params: unknown[]): void;
  trace(...params: unknown[]): void;
  debug(...params: unknown[]): void;
  error(...params: unknown[]): void;
  warn(...params: unknown[]): void;
  logTest(testResult: TestResult): void;
  collectMessages?(): void;
  flush?() : void;
  clear(): void;
}


export type RequestLogger = (response: HttpResponse, httpRegion?: HttpRegion) => void;
