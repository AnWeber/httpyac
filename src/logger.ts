


export interface Logger {
  info: (...data: Array<any>) => void;
  trace: (...data:Array<any>) => void;
  debug: (...data:Array<any>) => void;
  error: (...data:Array<any>) => void;
  warn: (...data:Array<any>) => void;
}

export const log: Logger = {
  info: console.info,
  trace: console.trace,
  debug: console.debug,
  error: console.error,
  warn: console.warn,
};