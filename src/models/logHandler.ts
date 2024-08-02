import { HttpRegion } from './httpRegion';
import { HttpResponse, StreamResponse } from './httpResponse';

export const enum LogLevel {
  trace = 1,
  debug = 2,
  warn = 5,
  info = 10,
  error = 100,
  none = 1000,
}

export interface LogHandler {
  readonly options: {
    level?: LogLevel;
    logMethod?: (level: LogLevel, ...params: unknown[]) => void;
  };
  info(...params: unknown[]): void;
  log(...params: unknown[]): void;
  trace(...params: unknown[]): void;
  debug(...params: unknown[]): void;
  error(...params: unknown[]): void;
  warn(...params: unknown[]): void;
}

export interface ConsoleLogHandler extends LogHandler {
  logPriority(message: string): void;
  collectMessages(): void;
  flush(): void;
}

export type RequestLogger = (response: HttpResponse | undefined, httpRegion?: HttpRegion) => Promise<void>;

export type StreamLogger = (type: string, response: HttpResponse & StreamResponse) => Promise<void>;
