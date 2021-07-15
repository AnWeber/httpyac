import { LogHandler } from '../models';
import { LogLevel } from '../logger';

export class CliLogger implements LogHandler {
  constructor(
    private readonly level = LogLevel.info
  ) {
  }
  info(...params: unknown[]): void {
    if (LogLevel.info >= this.level) {
      console.info(...params);
    }
  }
  log(...params: unknown[]): void {
    if (LogLevel.info >= this.level) {
      console.log(...params);
    }
  }
  trace(...params: unknown[]): void {
    if (LogLevel.trace >= this.level) {
      console.log(...params);
    }
  }
  debug(...params: unknown[]): void {
    if (LogLevel.debug >= this.level) {
      console.log(...params);
    }
  }
  error(...params: unknown[]): void {
    if (LogLevel.error >= this.level) {
      console.log(...params);
    }
  }
  warn(...params: unknown[]): void {
    if (LogLevel.warn >= this.level) {
      console.log(...params);
    }
  }
  clear(): void {
    console.clear();
  }
}
