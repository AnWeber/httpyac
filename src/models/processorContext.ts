import { HttpFile } from './httpFile';
import { HttpRegion } from './httpRegion';
import { HttpRequest } from './httpRequest';
import { Variables } from './variables';

export interface ProcessorContext{
  httpRegion: HttpRegion;
  httpFile: HttpFile;
  variables: Variables;
  request?: HttpRequest;
}