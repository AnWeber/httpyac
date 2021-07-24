import { BailSeriesHook, WaterfallHook, SeriesHook } from './hook';
import { HttpRegionParserResult } from './httpRegionParserResult';
import { HttpRequest } from './httpRequest';
import { HttpResponse } from './httpResponse';
import { getHttpLineGenerator, ParserContext } from './parserContext';
import { VariableProviderContext, ProcessorContext } from './processorContext';
import { Variables } from './variables';

export interface HttpFileHooks{
  readonly parse: ParseHook,
  readonly parseAfterRegion: ParseAfterRegionHook,
  readonly replaceVariable: ReplaceVariableHook;
  readonly provideEnvironments: ProvideEnvironmentsHook;
  readonly provideVariables: ProvideVariablesHook;


  readonly beforeRequest: BeforeRequestHook;
  readonly afterRequest: AfterRequestHook,
  readonly responseLogging: ResponseLoggingHook,
}

export class ParseHook extends BailSeriesHook<getHttpLineGenerator,
  HttpRegionParserResult,
  false,
  ParserContext
> {
  constructor() {
    super(obj => !!obj);
  }
}

export class ParseAfterRegionHook extends SeriesHook<ParserContext, void> {}
export class ProvideVariablesHook extends SeriesHook<string[] | undefined, Variables, string, VariableProviderContext> {}
export class ProvideEnvironmentsHook extends SeriesHook<VariableProviderContext, string[], string> { }
export class ReplaceVariableHook extends WaterfallHook<string, undefined, string, ProcessorContext> {
  constructor() {
    super(obj => obj === undefined);
  }
}
export class BeforeRequestHook extends SeriesHook<HttpRequest, void, HttpRequest, ProcessorContext> {}
export class AfterRequestHook extends SeriesHook<HttpResponse, void, HttpResponse, ProcessorContext> {}
export class ResponseLoggingHook extends WaterfallHook<HttpResponse, HttpResponse, ProcessorContext> {}
