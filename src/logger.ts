


export interface Logger {
  info: (message: string, ...data: Array<any>) => void;
  trace: (message: string, ...data:Array<any>) => void;
  debug: (message: string, ...data:Array<any>) => void;
  error: (message: string, ...data:Array<any>) => void;
  warn: (message: string, ...data:Array<any>) => void;
}

export const log: Logger = {
  info: console.info,
  trace: console.trace,
  debug: console.debug,
  error: console.error,
  warn: console.warn,
};