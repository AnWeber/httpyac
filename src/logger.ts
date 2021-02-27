

export enum LogLevel{
  trace = 0,
  debug = 2,
  warn = 5,
  info = 10,
  error = 100,
}


export type ChannelLogMethod = (channel: string, level: LogLevel, ...params: any[]) => void;
export interface OutputProvider{
  log: ChannelLogMethod,
}

export const outputProvider: OutputProvider = {
  log: (channel, level, ...params) => consoleOutputProvider(level, ...params),
};


function consoleOutputProvider(level: LogLevel, ...params: any[]) {
  switch (level) {
    case LogLevel.trace:
      console.trace(...params);
      break;
    case LogLevel.debug:
      console.debug(...params);
      break;
    case LogLevel.error:
      console.error(...params);
      break;
    case LogLevel.warn:
      console.warn(...params);
      break;
    default:
      console.info(...params);
      break;
  }
}

class Logger {
  public level: LogLevel;
  constructor(private readonly channel: string) {
    this.level = LogLevel.trace;
   }
  info(...params: any[]) {
    if (LogLevel.info >= this.level) {
      outputProvider.log(this.channel, LogLevel.info, ...params);
    }
  }
  log(...params: any[]) {
    if (LogLevel.info >= this.level) {
      outputProvider.log(this.channel, LogLevel.info, ...params);
    }
  }
  trace(...params: any[]) {
    if (LogLevel.trace >= this.level) {
      outputProvider.log(this.channel, LogLevel.trace, ...params);
    }
  }
  debug(...params: any[]) {
    if (LogLevel.debug >= this.level) {
      outputProvider.log(this.channel, LogLevel.debug, ...params);
    }
  }
  error(...params: any[]) {
    if (LogLevel.error >= this.level) {
      outputProvider.log(this.channel, LogLevel.error, ...params);
    }
  }
  warn(...params: any[]) {
    if (LogLevel.warn >= this.level) {
      outputProvider.log(this.channel, LogLevel.warn, ...params);
    }
  }
}

export const PopupChannel = 'PopupChannel';
export const RequestChannel = 'Requests';

export const log = new Logger('Log');
export const console = new Logger('Script Console');
export const logRequest = new Logger('Requests');
export const popupService = new Logger(PopupChannel);

