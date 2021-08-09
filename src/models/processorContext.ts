import { ConsoleLogHandler, RequestLogger } from './logHandler';
import { HttpClient } from './httpClient';
import { HttpFile } from './httpFile';
import { HttpRegion, ProcessedHttpRegion } from './httpRegion';
import { HttpRequest } from './httpRequest';
import { RepeatOptions } from './repeatOptions';
import { Variables } from './variables';
import { EnvironmentConfig } from './environmentConfig';


export type Dispose = () => void;

export interface Progress{
  isCanceled: () => boolean;
  register: (event: (() => void)) => Dispose;
  report?: (value: { message?: string, increment?: number }) => void;
}

export interface HttpFileSendContext{
  httpFile: HttpFile;
  config?: EnvironmentConfig,
  progress?: Progress;
  httpClient?: HttpClient;
  httpRegionPredicate?: (obj: HttpRegion) => boolean;
  processedHttpRegions?: Array<ProcessedHttpRegion>;
  scriptConsole?: ConsoleLogHandler;
  logResponse?: RequestLogger;
  repeat?: RepeatOptions;
  require?: Record<string, unknown>,
}

export interface HttpRegionsSendContext extends HttpFileSendContext{
  httpRegions: HttpRegion[];
}

export interface HttpRegionSendContext extends HttpFileSendContext{
  httpRegion: HttpRegion;
}
export interface ProcessorContext extends HttpRegionSendContext{
  httpClient: HttpClient;
  variables: Variables;
  request?: HttpRequest;
  showProgressBar?: boolean;
}


export type SendContext = HttpRegionSendContext | HttpFileSendContext | HttpRegionsSendContext;
