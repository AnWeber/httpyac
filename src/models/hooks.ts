import { LastOutHook, SeriesHook, WaterfallHook } from 'hookpoint';

import { HttpRegionParserResult } from './httpRegionParserResult';
import { Request } from './httpRequest';
import { HttpResponse } from './httpResponse';
import { getHttpLineGenerator, ParserContext } from './parserContext';
import { ProcessorContext } from './processorContext';
import { VariableProviderContext } from './variableProviderContext';
import { Variables } from './variables';

export interface HttpFileHooks {
  readonly parse: ParseHook;
  readonly parseMetaData: ParseMetaDataHook;
  readonly parseEndRegion: ParseEndRegionHook;
  readonly replaceVariable: ReplaceVariableHook;
  readonly provideEnvironments: ProvideEnvironmentsHook;
  readonly provideVariables: ProvideVariablesHook;
  readonly provideAssertValue: ProvideAssertValue;

  readonly execute: ExecuteHook;
  readonly onStreaming: OnStreaming;
  readonly onRequest: OnRequestHook;
  readonly onResponse: OnResponseHook;
  readonly responseLogging: ResponseLoggingHook;
}

export class ParseHook extends LastOutHook<[getHttpLineGenerator, ParserContext], HttpRegionParserResult | false> {
  constructor() {
    super(obj => !!obj);
    this.id = 'ParseHook';
  }
}

export class ParseMetaDataHook extends LastOutHook<[string, string | undefined, ParserContext], boolean> {
  constructor() {
    super(obj => !!obj);
    this.id = 'ParseMetaDataHook';
  }
}

export class ProvideAssertValue extends LastOutHook<
  [string, string | undefined, HttpResponse, ProcessorContext],
  unknown
> {
  constructor() {
    super(obj => obj !== false);
    this.id = 'ProvideAssertValue';
  }
}
export class ParseEndRegionHook extends SeriesHook<[ParserContext], void> {
  constructor() {
    super();
    this.id = 'ParseEndRegionHook';
  }
}
export class ProvideVariablesHook extends SeriesHook<[string[] | undefined, VariableProviderContext], Variables> {
  constructor() {
    super();
    this.id = 'ProvideVariablesHook';
  }
}
export class ProvideEnvironmentsHook extends SeriesHook<[VariableProviderContext], string[]> {
  constructor() {
    super();
    this.id = 'ProvideEnvironmentsHook';
  }
}
export class ReplaceVariableHook extends WaterfallHook<[unknown, string, ProcessorContext], undefined> {
  constructor() {
    super(obj => obj === undefined);
    this.id = 'ReplaceVariableHook';
  }
}
export class OnRequestHook extends SeriesHook<[Request, ProcessorContext], void> {
  constructor() {
    super();
    this.id = 'BeforeRequestHook';
  }
}
export class OnResponseHook extends SeriesHook<[HttpResponse, ProcessorContext], void> {
  constructor() {
    super();
    this.id = 'AfterRequestHook';
  }
}

export class OnStreaming extends SeriesHook<[ProcessorContext], void> {
  constructor() {
    super();
    this.id = 'OnStreaming';
  }
}
export class ResponseLoggingHook extends SeriesHook<[HttpResponse, ProcessorContext], void> {
  constructor() {
    super();
    this.id = 'ResponseLoggingHook';
  }
}
export class ExecuteHook extends SeriesHook<[ProcessorContext], boolean> {
  constructor() {
    super(obj => !obj);
    this.id = 'ExecuteHook';
  }
}
