import { EnvironmentConfig } from './environmentConfig';
import { HttpClient } from './httpClient';
import { HttpFile } from './httpFile';
import { HttpRegion, ProcessedHttpRegion } from './httpRegion';
import { Request } from './httpRequest';
import { ConsoleLogHandler, RequestLogger, StreamLogger } from './logHandler';
import { RepeatOptions } from './repeatOptions';
import { Variables } from './variables';

export type Dispose = () => void;

export interface Progress {
  isCanceled: () => boolean;
  register: (event: () => void) => Dispose;
  report?: (value: { message?: string; increment?: number }) => void;
}

export interface HttpFileSendContext {
  httpFile: HttpFile;
  config?: EnvironmentConfig;
  progress?: Progress;
  httpClient?: HttpClient;
  httpRegionPredicate?: (obj: HttpRegion) => boolean;
  processedHttpRegions?: Array<ProcessedHttpRegion>;
  scriptConsole?: ConsoleLogHandler;
  logStream?: StreamLogger;
  logResponse?: RequestLogger;
  repeat?: RepeatOptions;
  variables?: Variables;
  require?: Record<string, unknown>;
}

export interface HttpRegionsSendContext extends HttpFileSendContext {
  httpRegions: HttpRegion[];
}

export interface HttpRegionSendContext extends HttpFileSendContext {
  httpRegion: HttpRegion;
}
export interface ProcessorContext extends HttpRegionSendContext {
  httpClient: HttpClient;
  variables: Variables;
  request?: Request;
  showProgressBar?: boolean;
  options: Record<string, unknown>;
}

export function isProcessorContext(context: unknown): context is ProcessorContext {
  const test = context as ProcessorContext;
  return !!test?.httpClient && !!test?.httpFile && !!test?.variables && !!test?.config;
}

export type SendContext = HttpRegionSendContext | HttpFileSendContext | HttpRegionsSendContext;
