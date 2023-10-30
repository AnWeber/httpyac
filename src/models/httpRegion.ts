import { ExecuteHook, OnRequestHook, OnResponseHook, OnStreaming, ResponseLoggingHook } from './hooks';
import { HttpFile } from './httpFile';
import { Request } from './httpRequest';
import { HttpResponse } from './httpResponse';
import { HttpSymbol } from './httpSymbol';
import { ProcessorContext } from './processorContext';
import { TestResult } from './testResult';
import { Variables } from './variables';

export type PartialProperty<T, TProperty extends string, TProperty2 extends string> = Omit<
  Omit<T, TProperty>,
  TProperty2
> &
  Partial<T>;

export interface RequestClientHooks {
  onRequest: OnRequestHook;
  onStreaming: OnStreaming;
  onResponse: OnResponseHook;
  responseLogging: ResponseLoggingHook;
}

export interface HttpRegion {
  readonly id: string;
  request?: Request;
  response?: HttpResponse;
  symbol: HttpSymbol;
  metaData: Record<string, string | undefined | true>;
  testResults?: Array<TestResult>;
  responseRefs?: Array<string>;
  variablesPerEnv: Record<string, Variables>;
  readonly hooks: RequestClientHooks & {
    execute: ExecuteHook;
  };
  isGlobal(): boolean;
  clone(httpFile?: HttpFile): HttpRegion;
  execute(context: PartialProperty<ProcessorContext, 'httpRegion', 'hooks'>, isMainContext?: boolean): Promise<boolean>;
}
