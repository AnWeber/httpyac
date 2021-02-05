

export enum LogLevel{
  trace = 0,
  debug = 2,
  warn = 5,
  info = 10,
  error = 100,
}


export interface Logger {
  level: LogLevel,
  info: (...data: Array<any>) => void;
  trace: (...data:Array<any>) => void;
  debug: (...data:Array<any>) => void;
  error: (...data:Array<any>) => void;
  warn: (...data:Array<any>) => void;
}

export const log: Logger = {
  level: LogLevel.warn,
  info: console.info,
  trace: console.trace,
  debug: console.debug,
  error: console.error,
  warn: console.warn,
};