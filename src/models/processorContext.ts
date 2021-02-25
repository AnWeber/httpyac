import { HttpClient } from './httpClient';
import { HttpFile } from './httpFile';
import { HttpRegion } from './httpRegion';
import { HttpRequest } from './httpRequest';
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
  httpClient: HttpClient;
}

export enum RepeatOrder{
  sequential,
  parallel,
}

export interface HttpRegionSendContext extends HttpFileSendContext{
  httpRegion: HttpRegion;
  repeat?: {
    type: RepeatOrder;
    count: number;
  }
}
export interface ProcessorContext extends HttpRegionSendContext{
  variables: Variables;
  request?: HttpRequest;
  cancelVariableReplacer?: () => void;
  showProgressBar?: boolean;
}