import { ConsoleLogHandler, LogHandler, LogLevel } from '../models';

type LogCache = Array<() => void> | undefined;

export class Logger implements ConsoleLogHandler {
  private collectCache: LogCache;
  private priorityCache: LogCache;
  constructor(
    readonly options: {
      level?: LogLevel;
      logMethod?: (level: LogLevel, ...params: unknown[]) => void;
      onlyFailedTests?: boolean;
      noTrace?: boolean;
    }
  ) {}

  public collectMessages(): void {
    this.collectCache = [];
    this.priorityCache = [];
  }

  public flush(): void {
    this.priorityCache = this.flushCache(this.priorityCache);
    this.collectCache = this.flushCache(this.collectCache);
  }

  private flushCache(cache: LogCache) {
    if (cache) {
      for (const action of cache) {
        action();
      }
      return [];
    }
    return undefined;
  }

  private writeLog(logLevel: LogLevel, cache: LogCache, action: (...params: unknown[]) => void, params: unknown[]) {
    if (!this.options?.level || logLevel >= this.options.level) {
      let log = () => action(...params);
      if (this.options?.logMethod) {
        log = () => this.options?.logMethod?.(logLevel, ...params);
      }
      if (cache) {
        cache.push(log);
      } else {
        log();
      }
    }
  }

  public info(...params: unknown[]): void {
    this.writeLog(LogLevel.info, this.collectCache, console.info, params);
  }
  public log(...params: unknown[]): void {
    this.writeLog(LogLevel.info, this.collectCache, console.log, params);
  }
  public trace(...params: unknown[]): void {
    this.writeLog(LogLevel.trace, this.collectCache, this.options.noTrace ? console.debug : console.trace, params);
  }
  public debug(...params: unknown[]): void {
    this.writeLog(LogLevel.debug, this.collectCache, console.debug, params);
  }
  public error(...params: unknown[]): void {
    this.writeLog(LogLevel.error, this.collectCache, console.error, params);
  }
  public warn(...params: unknown[]): void {
    this.writeLog(LogLevel.warn, this.collectCache, console.warn, params);
  }
  public logPriority(...msg: Array<string>) {
    this.writeLog(LogLevel.info, this.priorityCache, console.info, msg);
  }
  public clear(): void {
    console.clear();
  }
}

export const log: LogHandler = new Logger({
  level: LogLevel.warn,
  noTrace: true,
});
