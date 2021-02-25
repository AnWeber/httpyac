

export enum LogLevel{
  trace = 0,
  debug = 2,
  warn = 5,
  info = 10,
  error = 100,
}


export interface PopupService{
  readonly info: (...data: Array<any>) => void;
  readonly error: (...data:Array<any>) => void;
  readonly warn: (...data:Array<any>) => void;

}

export interface Logger {
  level: LogLevel,
  readonly log: (...data: Array<any>) => void;
  readonly info: (...data: Array<any>) => void;
  readonly trace: (...data:Array<any>) => void;
  readonly debug: (...data:Array<any>) => void;
  readonly error: (...data:Array<any>) => void;
  readonly warn: (...data:Array<any>) => void;
}


export type LogMethod = (level: LogLevel, ...params: any[]) => void;


function logToOutputChannel(level: LogLevel, logger: LogMethod, ...params: any[]) {
  if (level >= log.level) {
    logger(level, ...params);
  }
}

export interface OutputProvider{
  log: LogMethod,
  showMessage?: LogMethod;
}

export const outputProvider: OutputProvider = {
  log: (level, ...params) => {
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
  },
};

export const log: Logger = {
  level: LogLevel.warn,
  log: (...params) => logToOutputChannel(LogLevel.info, outputProvider.log, ...params),
  info: (...params) => logToOutputChannel(LogLevel.info, outputProvider.log, ...params),
  trace: (...params) => logToOutputChannel(LogLevel.trace, outputProvider.log, ...params),
  debug: (...params) => logToOutputChannel(LogLevel.debug, outputProvider.log, ...params),
  error: (...params) => logToOutputChannel(LogLevel.error, outputProvider.log, ...params),
  warn: (...params) => logToOutputChannel(LogLevel.warn, outputProvider.log, ...params),
};

export const popupService: PopupService = {
  info: (...params) => logToOutputChannel(LogLevel.info, outputProvider.showMessage || outputProvider.log, ...params),
  error: (...params) => logToOutputChannel(LogLevel.error, outputProvider.showMessage || outputProvider.log, ...params),
  warn: (...params) => logToOutputChannel(LogLevel.warn, outputProvider.showMessage || outputProvider.log, ...params),
};