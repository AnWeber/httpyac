import { BailSeriesHook, WaterfallHook, SeriesHook } from './hook';
import { HttpRegionParserResult } from './httpRegionParserResult';
import { Request } from './httpRequest';
import { HttpResponse } from './httpResponse';
import { getHttpLineGenerator, ParserContext } from './parserContext';
import { ProcessorContext } from './processorContext';
import { VariableProviderContext } from './variableProviderContext';
import { Variables } from './variables';

export interface HttpFileHooks {
  readonly parse: ParseHook;
  readonly parseEndRegion: ParseEndRegionHook;
  readonly replaceVariable: ReplaceVariableHook;
  readonly provideEnvironments: ProvideEnvironmentsHook;
  readonly provideVariables: ProvideVariablesHook;

  readonly onRequest: OnRequestHook;
  readonly onResponse: OnResponseHook;
  readonly responseLogging: ResponseLoggingHook;
}

export class ParseHook extends BailSeriesHook<getHttpLineGenerator, HttpRegionParserResult, false, ParserContext> {
  constructor() {
    super(obj => !!obj);
    this.id = 'ParseHook';
  }
}

export class ParseEndRegionHook extends SeriesHook<ParserContext, void> {
  constructor() {
    super();
    this.id = 'ParseEndRegionHook';
  }
}
export class ProvideVariablesHook extends SeriesHook<string[] | undefined, Variables, string, VariableProviderContext> {
  constructor() {
    super();
    this.id = 'ProvideVariablesHook';
  }
}
export class ProvideEnvironmentsHook extends SeriesHook<VariableProviderContext, string[], string> {
  constructor() {
    super();
    this.id = 'ProvideEnvironmentsHook';
  }
}
export class ReplaceVariableHook extends WaterfallHook<unknown, undefined, string, ProcessorContext> {
  constructor() {
    super(obj => obj === undefined);
    this.id = 'ReplaceVariableHook';
  }
}
export class OnRequestHook extends SeriesHook<Request, void, Request, ProcessorContext> {
  constructor() {
    super();
    this.id = 'BeforeRequestHook';
  }
}
export class OnResponseHook extends SeriesHook<HttpResponse, void, HttpResponse, ProcessorContext> {
  constructor() {
    super();
    this.id = 'AfterRequestHook';
  }
}

export class OnStreaming extends SeriesHook<ProcessorContext, void> {
  constructor() {
    super();
    this.id = 'OnStreaming';
  }
}
export class ResponseLoggingHook extends BailSeriesHook<HttpResponse, void, HttpResponse, ProcessorContext> {
  constructor() {
    super();
    this.id = 'ResponseLoggingHook';
  }
}
export class ExecuteHook extends SeriesHook<ProcessorContext, boolean> {
  constructor() {
    super(obj => !obj);
    this.id = 'ExecuteHook';
  }
}
