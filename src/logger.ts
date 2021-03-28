import { HttpClientOptions, HttpResponse } from './models';
import { isString, toMultiLineString, isMimeTypeJSON } from './utils';


export enum LogLevel{
  trace = 0,
  debug = 2,
  warn = 5,
  info = 10,
  error = 100,
}


export function toLogLevel(level: string | undefined) {
  switch (level) {
    case 'trace':
      return LogLevel.trace;
    case 'debug':
      return LogLevel.debug;
    case 'warn':
      return LogLevel.warn;
    case 'error':
      return LogLevel.error;
  }
  return LogLevel.info;
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
    this.level = LogLevel.warn;
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

enum AnsiColors {
  Black = '\u001b[30m',
  Red = '\u001b[31m',
  Green = '\u001b[32m',
  Yellow = '\u001b[33m',
  Blue = '\u001b[34m',
  Magenta = '\u001b[35m',
  Cyan = '\u001b[36m',
  White = '\u001b[37m',
  Reset = '\u001b[0m'
}

class LogRequestsLogger {
  public prettyPrint: boolean = false;
  public supportAnsiColors: boolean = true;
  public isRequestLogEnabled: boolean = true;
  public isResponseHeaderLogEnabled: boolean = true;
  public logResponseBodyLength: number = 0;

  private getAnsiColor(color: AnsiColors) {
    if (this.supportAnsiColors) {
      return color;
    }
    return '';
  }

  info(response: HttpResponse) {
    const result: Array<string> = [];

    if (response.request && this.isRequestLogEnabled) {
      result.push(...this.logRequest(response.request));
    }

    if (this.isResponseHeaderLogEnabled) {
      if (result.length > 0) {
        result.push('');
      }
      result.push(...this.logResponseHeader(response));
    }

    if (isString(response.body)) {
      if (result.length > 0) {
        result.push('');
      }
      let body = response.body;

      if (isMimeTypeJSON(response.contentType) && this.prettyPrint) {
        try {
          body = JSON.stringify(JSON.parse(body), null, 2);
        } catch (err) {
          log.trace(err);
        }
      }

      {if (this.logResponseBodyLength > 0) {
        body = body.substr(0, Math.min(body.length, this.logResponseBodyLength));
        if (response.body.length >= this.logResponseBodyLength) {
          body += `... (${response.body.length - this.logResponseBodyLength} characters  more)`;
        }
      }}
      result.push(body);
    }
    outputProvider.log("Requests", LogLevel.info, toMultiLineString(result));
  }

  private logRequest(request: HttpClientOptions) {
    const result: Array<string> = [];
    result.push(`${this.getAnsiColor(AnsiColors.Cyan)}${request.method} ${request.url}${this.getAnsiColor(AnsiColors.Reset)}`);
    result.push(...Object.entries(request.headers)
      .map(([key, value]) => `${this.getAnsiColor(AnsiColors.Yellow)}${key}${this.getAnsiColor(AnsiColors.Reset)}: ${value}`)
      .sort()
    );
    if (isString(request.body)) {
      result.push('');
      result.push(request.body);
    }
    return result;
  }

  private logResponseHeader(response: HttpResponse) {
    const result: Array<string> = [];
    let responseColor = AnsiColors.Green;
    if (response.statusCode >= 400) {
      responseColor = AnsiColors.Red;
    }
    result.push(`${this.getAnsiColor(responseColor)}HTTP${response.httpVersion || ''} ${response.statusCode} - ${response.statusMessage}${this.getAnsiColor(AnsiColors.Reset)}`);
    result.push(...Object.entries(response.headers)
      .filter(([key]) => !key.startsWith(':'))
      .map(([key, value]) => `${this.getAnsiColor(AnsiColors.Yellow)}${key}${this.getAnsiColor(AnsiColors.Reset)}: ${value}`)
      .sort()
    );
    return result;
  }
}

export const PopupChannel = 'PopupChannel';
export const RequestChannel = 'Requests';

export const log = new Logger('Log');
export const scriptConsole = new Logger('Script Console');

export const logRequest = new LogRequestsLogger();
export const popupService = new Logger(PopupChannel);
