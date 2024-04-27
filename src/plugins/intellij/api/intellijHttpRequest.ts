import * as models from '../../../models';
import * as utils from '../../../utils';
import {
  HttpClientRequest,
  PreRequestHttpClientRequest,
  RequestBody,
  RequestEnvironment,
  RequestHeader,
  RequestHeaders,
  RequestUrl,
  Variables,
} from './stubs';
import { IntellijVariables } from './intellijVariables';
import { replaceIntellijVariableRandom } from '../replacer';

export class IntellijHttpClientRequest implements HttpClientRequest {
  private _url: string;
  method: string;
  private _body: string | undefined;
  headers: RequestHeaders;
  environment: RequestEnvironment;
  variables: Variables;

  public url() {
    return this._url;
  }
  public body(): string {
    return this._body || '';
  }
  constructor(context: models.ProcessorContext) {
    this._url = context.request?.url || '';
    this.method = context.request?.method || '';
    this._body = context.request?.body && utils.toString(context.request?.body);
    this.headers = new IntellijRequestHeaders(context);
    this.environment = new IntellijRequestEnvironment(context.variables);
    this.variables = new IntellijVariables(context);
  }
}

export class IntellijPreRequestHttpClientRequest implements PreRequestHttpClientRequest {
  url: RequestUrl;
  method: string;
  body: IntellijRequestBody;
  headers: RequestHeaders;
  environment: RequestEnvironment;
  variables: Variables;

  constructor(context: models.ProcessorContext) {
    this.url = new IntellijRequestUrl(context);
    this.method = context.request?.method || '';
    this.body = new IntellijRequestBody(context);
    this.headers = new IntellijRequestHeaders(context);
    this.environment = new IntellijRequestEnvironment(context.variables);
    this.variables = new IntellijVariables(context);
  }
}

class IntellijRequestBody implements RequestBody {
  constructor(private readonly context: models.ProcessorContext) {}
  getRaw(): string {
    return utils.toString(this.context.request?.body) || '';
  }
  tryGetSubstituted(): string {
    const result = tryGetSubstituted(this.getRaw(), this.context.variables);
    if (result && this.context.request?.body) {
      this.context.request.body = result;
    }
    return result;
  }
}

class IntellijRequestHeaders implements RequestHeaders {
  constructor(private readonly context: models.ProcessorContext) {}
  all(): Array<RequestHeader> {
    if (this.context.request?.headers) {
      return Object.keys(this.context.request.headers).map(name => new IntellijRequestHeader(name, this.context));
    }
    return [];
  }
  findByName(name: string): RequestHeader | null {
    if (utils.getHeader(this.context.request?.headers, name)) {
      return new IntellijRequestHeader(name, this.context);
    }
    return null;
  }
}

class IntellijRequestHeader implements RequestHeader {
  constructor(
    readonly name: string,
    private readonly context: models.ProcessorContext
  ) {}
  value(): string {
    return this.getRawValue();
  }
  getRawValue(): string {
    return utils.toString(utils.getHeader(this.context.request?.headers, this.name)) || '';
  }
  tryGetSubstitutedValue(): string {
    const result = tryGetSubstituted(this.getRawValue(), this.context.variables);
    if (result && this.context.request?.headers) {
      utils.deleteHeader(this.context.request.headers, this.name);
      this.context.request.headers[this.name] = result;
    }
    return result;
  }
}

class IntellijRequestUrl implements RequestUrl {
  constructor(private readonly context: models.ProcessorContext) {}
  getRaw(): string {
    return this.context.request?.url || '';
  }
  tryGetSubstituted(): string {
    const result = tryGetSubstituted(this.getRaw(), this.context.variables);
    if (result && this.context.request?.body) {
      this.context.request.body = result;
    }
    return result;
  }
}

class IntellijRequestEnvironment implements RequestEnvironment {
  constructor(private readonly variables: models.Variables) {}
  get(name: string): string | null {
    const result = utils.toString(this.variables[name]);
    if (utils.isUndefined(result)) {
      return null;
    }
    return result;
  }
}

function tryGetSubstituted(value: string, variables: models.Variables) {
  let result = value;

  const replacers: Array<(variable: string) => string | undefined> = [
    replaceIntellijVariableRandom,
    variable => {
      const obj = variables[variable];
      if (!utils.isUndefined(obj)) {
        return utils.toString(obj);
      }
      return undefined;
    },
  ];

  for (const replacer of replacers) {
    result = parseHandlebars(result, replacer);
  }
  return result;
}

function parseHandlebars(text: string, evalExpression: (variable: string, searchValue: string) => string | undefined) {
  if (!utils.isString(text)) {
    return text;
  }
  let match: RegExpExecArray | null;
  let start;
  let result = text;
  let infiniteLoopStopper = 0;
  while (start !== result && infiniteLoopStopper++ < 100) {
    start = result;
    while ((match = utils.HandlebarsSingleLine.exec(start)) !== null) {
      const [searchValue, variable] = match;
      const value = evalExpression(variable, searchValue);
      if (typeof value !== 'undefined' && searchValue === text) {
        return value;
      }
      const valueString = utils.toString(value);
      if (typeof valueString !== 'undefined') {
        result = result.replace(searchValue, () => valueString);
      }
    }
  }
  return result;
}
