import { HttpFile } from './httpFile';
import { HttpRegion } from './httpRegion';
import { HttpRequest } from './httpRequest';
import { Variables } from './variables';


export type Dispose = () => void;

export interface Progress{
  showProgressBar?: boolean;
  isCanceled: () => boolean;
  register: (event: (() => void)) => Dispose;
  report: (value: { message?: string, increment?: number }) => void;
}

export interface HttpFileSendContext{
  httpFile: HttpFile;
  progress?: Progress;
}

export interface HttpRegionSendContext extends HttpFileSendContext{
  httpRegion: HttpRegion;
}
export interface ProcessorContext extends HttpRegionSendContext{
  variables: Variables;
  request?: HttpRequest;
}