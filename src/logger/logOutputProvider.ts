import { LogChannels } from './logChannels';
import { LogLevel } from './logLevel';


export type ChannelLogMethod = (channel: LogChannels, level: LogLevel, ...params: any[]) => void;
export interface LogOutputProvider{
  log: ChannelLogMethod,
  clear: (channel: LogChannels) => void;
}

export const logOutputProvider: LogOutputProvider = {
  log: (channel, level, ...params) => consoleLogOutputProvider(level, ...params),
  clear: (channel) => {
    // console should not be cleared
  },
};


export function consoleLogOutputProvider(level: LogLevel, ...params: any[]) {
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