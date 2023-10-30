import { EnvironmentConfig } from './environmentConfig';
import { OnRequestHook, OnResponseHook, OnStreaming, ResponseLoggingHook } from './hooks';
import { HttpFile } from './httpFile';
import { HttpRegion } from './httpRegion';
import { Request } from './httpRequest';
import { ConsoleLogHandler, RequestLogger, StreamLogger } from './logHandler';
import { ProcessedHttpRegion } from './processedHttpRegion';
import { RepeatOptions } from './repeatOptions';
import { RequestClient } from './requestClient';
import { Variables } from './variables';

export type Dispose = () => void;

export interface Progress {
  divider?: number;
  isCanceled: () => boolean;
  register: (event: () => void) => Dispose;
  report?: (value: { message?: string; increment?: number }) => void;
}

export interface HttpFileSendContext {
  httpFile: HttpFile;
  activeEnvironment?: string[];
  config?: EnvironmentConfig;
  progress?: Progress;
  httpRegionPredicate?: (obj: HttpRegion) => boolean;
  processedHttpRegions?: Array<ProcessedHttpRegion>;
  scriptConsole?: ConsoleLogHandler;
  logStream?: StreamLogger;
  logResponse?: RequestLogger;
  repeat?: RepeatOptions;
  variables?: Variables;
}

export interface HttpRegionsSendContext extends HttpFileSendContext {
  httpRegions: HttpRegion[];
}

export interface HttpRegionSendContext extends HttpFileSendContext {
  httpRegion: HttpRegion;
}

export interface ProcessorContext extends HttpRegionSendContext {
  variables: Variables;
  hooks: {
    onRequest: OnRequestHook;
    onStreaming: OnStreaming;
    onResponse: OnResponseHook;
    responseLogging: ResponseLoggingHook;
  };
  options: Record<string, unknown>;
  request?: Request;
  requestClient?: RequestClient;
  isMainContext?: boolean;
}

export type SendContext = HttpRegionSendContext | HttpFileSendContext | HttpRegionsSendContext;
