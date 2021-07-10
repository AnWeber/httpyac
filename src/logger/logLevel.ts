export enum LogLevel{
  none = 0,
  trace = 0,
  debug = 2,
  warn = 5,
  info = 10,
  error = 100,
}

export function toLogLevel(level: string | undefined) : LogLevel {
  switch (level) {
    case 'trace':
      return LogLevel.trace;
    case 'debug':
      return LogLevel.debug;
    case 'warn':
      return LogLevel.warn;
    case 'error':
      return LogLevel.error;
    default:
      return LogLevel.info;
  }
}
