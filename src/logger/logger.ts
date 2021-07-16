import { LogChannels } from './logChannels';
import { LogLevel } from './logLevel';
import { logOutputProvider } from './logOutputProvider';

export class Logger {
  public level: LogLevel;
  constructor(private readonly channel: LogChannels) {
    this.level = LogLevel.warn;
  }
  info(...params: unknown[]): void {
    if (LogLevel.info >= this.level) {
      logOutputProvider.log(this.channel, LogLevel.info, ...params);
    }
  }
  log(...params: unknown[]): void {
    if (LogLevel.info >= this.level) {
      logOutputProvider.log(this.channel, LogLevel.info, ...params);
    }
  }
  trace(...params: unknown[]): void {
    if (LogLevel.trace >= this.level) {
      logOutputProvider.log(this.channel, LogLevel.trace, ...params);
    }
  }
  debug(...params: unknown[]): void {
    if (LogLevel.debug >= this.level) {
      logOutputProvider.log(this.channel, LogLevel.debug, ...params);
    }
  }
  error(...params: unknown[]): void {
    if (LogLevel.error >= this.level) {
      logOutputProvider.log(this.channel, LogLevel.error, ...params);
    }
  }
  warn(...params: unknown[]): void {
    if (LogLevel.warn >= this.level) {
      logOutputProvider.log(this.channel, LogLevel.warn, ...params);
    }
  }
  clear(): void {
    logOutputProvider.clear(this.channel);
  }
}

export const log = new Logger(LogChannels.Log);

export const popupService = new Logger(LogChannels.PopupChannel);
