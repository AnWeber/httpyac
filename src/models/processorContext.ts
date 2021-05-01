import { HttpClient } from './httpClient';
import { HttpFile } from './httpFile';
import { HttpRegion } from './httpRegion';
import { HttpRequest } from './httpRequest';
import { RepeatOptions } from './repeatOptions';
import { Variables } from './variables';


export type Dispose = () => void;

export interface Progress{
  isCanceled: () => boolean;
  register: (event: (() => void)) => Dispose;
  report: (value: { message?: string, increment?: number }) => void;
}

export interface HttpFileSendContext{
  httpFile: HttpFile;
  progress?: Progress;
  httpClient?: HttpClient;
  httpRegionPredicate?: (obj: HttpRegion) => boolean;
}

export interface HttpRegionsSendContext extends HttpFileSendContext{
  httpRegions: HttpRegion[];
}

export interface HttpRegionSendContext extends HttpFileSendContext{
  httpRegion: HttpRegion;
  repeat?: RepeatOptions
}
export interface ProcessorContext extends HttpRegionSendContext{
  httpClient: HttpClient;
  variables: Variables;
  request?: HttpRequest;
  cancelVariableReplacer?: () => void;
  showProgressBar?: boolean;
}
