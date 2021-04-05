import { HttpResponse } from '../models';
import { isMimeTypeJSON, isString, toMultiLineString } from '../utils';
import { AnsiColors } from './ansiColors';
import { LogChannels } from './logChannels';
import { log } from './logger';
import { LogLevel } from './logLevel';
import { logOutputProvider } from './logOutputProvider';

import { NormalizedOptions } from 'got';

class LogRequestsLogger {
  private isFirstRequest:boolean = true;
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
    if (this.isFirstRequest) {
      this.isFirstRequest = false;
    } else {
      result.push('--------------------------------------------------');
    }

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
    logOutputProvider.log(LogChannels.Request, LogLevel.info, toMultiLineString(result));
  }

  private logRequest(request: NormalizedOptions) {
    const result: Array<string> = [];
    result.push(`${this.getAnsiColor(AnsiColors.Cyan)}${request.method} ${request.url}${this.getAnsiColor(AnsiColors.Reset)}`);
    if (request.headers) {
      result.push(...Object.entries(request.headers)
        .map(([key, value]) => `${this.getAnsiColor(AnsiColors.Yellow)}${key}${this.getAnsiColor(AnsiColors.Reset)}: ${value}`)
        .sort()
      );
    }
    if (request.https?.certificate || request.https?.pfx) {
      result.push(`Client-Cert: true`);
    }
    if (request.body) {
      result.push('');
      if (isString(request.body)) {
        result.push(request.body);
      } else if (Buffer.isBuffer(request.body)) {
        result.push(`buffer<${request.body.byteLength}>`);
      }
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


export const logRequest = new LogRequestsLogger();