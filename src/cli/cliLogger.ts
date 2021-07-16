import { LogHandler, TestResult, testSymbols } from '../models';
import { LogLevel } from '../logger';
import { chalkInstance } from '../utils';

export class CliLogger implements LogHandler {
  private collectCache: Array<() => void> | undefined;
  constructor(
    private readonly level = LogLevel.info,
    private readonly onlyFailedTests: boolean,
  ) {
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

  private exec(logLevel: LogLevel, action: () => void) {
    if (logLevel >= this.level) {
      if (this.collectCache) {
        this.collectCache.push(action);
      } else {
        action();
      }
    }
  }

  info(...params: unknown[]): void {
    this.exec(LogLevel.info, () => console.info(...params));
  }
  log(...params: unknown[]): void {
    this.exec(LogLevel.info, () => console.log(...params));
  }
  trace(...params: unknown[]): void {
    this.exec(LogLevel.trace, () => console.trace(...params));
  }
  debug(...params: unknown[]): void {
    this.exec(LogLevel.debug, () => console.debug(...params));
  }
  error(...params: unknown[]): void {
    this.exec(LogLevel.error, () => console.error(...params));
  }
  warn(...params: unknown[]): void {
    this.exec(LogLevel.warn, () => console.warn(...params));
  }
  logTest(testResult: TestResult): void {
    const chalk = chalkInstance();
    if (!this.onlyFailedTests && testResult.result) {
      this.exec(LogLevel.info, () => console.info(chalk`{green ${testSymbols.ok} ${testResult.message || 'Test passed'}}`));
    } else if (!testResult.result) {
      this.exec(LogLevel.info, () => console.error(chalk`{red ${testSymbols.error} ${testResult.message || 'Test failed'} (${testResult.error?.displayMessage})}`));
    }
  }
  clear(): void {
    console.clear();
  }
}
