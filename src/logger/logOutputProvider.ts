/* eslint-disable no-console */
import { LogChannels } from './logChannels';
import { LogLevel } from './logLevel';


export type ChannelLogMethod = (channel: LogChannels, level: LogLevel, ...params: unknown[]) => void;
export interface LogOutputProvider{
  log: ChannelLogMethod,
  clear: (channel: LogChannels) => void;
}

export const logOutputProvider: LogOutputProvider = {
  log: (_channel, level, ...params) => consoleLogOutputProvider(level, ...params),
  clear: () => {
    console.clear();
  },
};


export function consoleLogOutputProvider(level: LogLevel, ...params: unknown[]) : void {
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
