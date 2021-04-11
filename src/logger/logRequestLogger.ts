import { HttpResponse } from '../models';
import { isString, toMultiLineString } from '../utils';
import { Chalk, Instance} from 'chalk';
import { LogChannels } from './logChannels';
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


  info(response: HttpResponse) {

    const chalk = new Instance(this.supportAnsiColors ? undefined : {level: 0});
    const result: Array<string> = [];
    if (this.isFirstRequest) {
      this.isFirstRequest = false;
    } else {
      result.push(chalk`{gray --------------------------------------------------}`);
    }

    if (response.request && this.isRequestLogEnabled) {
      result.push(...this.logRequest(response.request, chalk));
    }

    if (this.isResponseHeaderLogEnabled) {
      if (result.length > 0) {
        result.push('');
      }
      result.push(...this.logResponseHeader(response, chalk));
    }

    if (isString(response.body)) {
      if (result.length > 0) {
        result.push('');
      }
      let body = response.body;

      if (response.parsedBody) {
        body = JSON.stringify(response.parsedBody, null, 2);
      }
      if (this.logResponseBodyLength > 0) {
        body = body.substr(0, Math.min(body.length, this.logResponseBodyLength));
        if (response.body.length >= this.logResponseBodyLength) {
          body += `... (${response.body.length - this.logResponseBodyLength} characters  more)`;
        }
      }
      result.push(body);
    }
    logOutputProvider.log(LogChannels.Request, LogLevel.info, toMultiLineString(result));
  }

  private logRequest(request: NormalizedOptions, chalk: Chalk) {
    const result: Array<string> = [];
    result.push(chalk`{bold ${request.method} ${request.url}}`);
    if (request.headers) {
      result.push(...Object.entries(request.headers)
        .map(([key, value]) => chalk`{yellow ${key}}: ${value}`)
        .sort()
      );
    }
    if (request.https?.certificate || request.https?.pfx) {
      result.push( chalk`{yellow client-cert}: true`);
    }
    if (request.body) {
      result.push('');
      if (isString(request.body)) {
        result.push(chalk`{gray ${request.body}}`);
      } else if (Buffer.isBuffer(request.body)) {
        result.push(`buffer<${request.body.byteLength}>`);
      }
    }
    return result;
  }

  private logResponseHeader(response: HttpResponse, chalk: Chalk) {
    const result: Array<string> = [];
    if (response.statusCode >= 400) {
      result.push(chalk`{red.bold HTTP/${response.httpVersion || ''}} {red.bold ${response.statusCode}} {red ${response.statusMessage}}`);
    } else {
      result.push(chalk`{green.bold HTTP/${response.httpVersion || ''}} {green.bold ${response.statusCode}} {bold ${response.statusMessage}}`);
    }
    result.push(...Object.entries(response.headers)
      .filter(([key]) => !key.startsWith(':'))
      .map(([key, value]) => chalk`{yellow ${key}}: ${value}`)
      .sort()
    );
    return result;
  }
}


export const logRequest = new LogRequestsLogger();