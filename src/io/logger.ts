import { LogLevel, LogHandler, ConsoleLogHandler } from '../models';

export class Logger implements ConsoleLogHandler {
  private collectCache: Array<() => void> | undefined;
  constructor(readonly options: {
    level?: LogLevel,
    logMethod?: (level: LogLevel, ...params: unknown[]) => void,
    onlyFailedTests?: boolean;
  }) {
  }

  collectMessages(): void {
    this.collectCache = [];
  }

  flush(): void {
    if (this.collectCache) {
      for (const action of this.collectCache) {
        action();
      }
      delete this.collectCache;
    }
  }

  private writeLog(logLevel: LogLevel, action: (...params: unknown[]) => void, params: unknown[]) {
    if (logLevel >= (this.options?.level || LogLevel.warn)) {
      const log = this.options?.logMethod ? () => this.options?.logMethod?.(logLevel, ...params) : () => action(...params);
      if (this.collectCache) {
        this.collectCache.push(log);
      } else {
        log();
      }
    }
  }

  info(...params: unknown[]): void {
    this.writeLog(LogLevel.info, console.info, params);
  }
  log(...params: unknown[]): void {
    this.writeLog(LogLevel.info, console.log, params);
  }
  trace(...params: unknown[]): void {
    this.writeLog(LogLevel.trace, console.trace, params);
  }
  debug(...params: unknown[]): void {
    this.writeLog(LogLevel.debug, console.debug, params);
  }
  error(...params: unknown[]): void {
    this.writeLog(LogLevel.error, console.error, params);
  }
  warn(...params: unknown[]): void {
    this.writeLog(LogLevel.warn, console.warn, params);
  }
  logTest(result: boolean, message: string): void {
    if (!this.options?.onlyFailedTests && result) {
      this.writeLog(LogLevel.info, console.info, [message]);
    } else if (!result) {
      this.writeLog(LogLevel.info, console.error, [message]);
    }
  }
  clear(): void {
    console.clear();
  }
}


export const log: LogHandler = new Logger({});
