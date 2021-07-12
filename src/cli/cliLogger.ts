import { LogHandler } from '../models';
import { LogLevel } from '../logger';

export class CliLogger implements LogHandler {
  constructor(
    private readonly level = LogLevel.info,
    readonly logLines?: Array<unknown>
  ) {
  }
  info(...params: unknown[]): void {
    if (LogLevel.info >= this.level) {
      console.info(...params);
      this.logLines?.push?.(...params);
    }
  }
  log(...params: unknown[]): void {
    if (LogLevel.info >= this.level) {
      console.log(...params);
      this.logLines?.push?.(...params);
    }
  }
  trace(...params: unknown[]): void {
    if (LogLevel.trace >= this.level) {
      console.log(...params);
      this.logLines?.push?.(...params);
    }
  }
  debug(...params: unknown[]): void {
    if (LogLevel.debug >= this.level) {
      console.log(...params);
      this.logLines?.push?.(...params);
    }
  }
  error(...params: unknown[]): void {
    if (LogLevel.error >= this.level) {
      console.log(...params);
      this.logLines?.push?.(...params);
    }
  }
  warn(...params: unknown[]): void {
    if (LogLevel.warn >= this.level) {
      console.log(...params);
      this.logLines?.push?.(...params);
    }
  }
  clear(): void {
    console.clear();
  }
}
