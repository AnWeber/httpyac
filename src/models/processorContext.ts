import { HttpFile } from './httpFile';
import { HttpRegion } from './httpRegion';
import { Variables } from './variables';

export interface ProcessorContext{
  httpRegion: HttpRegion;
  httpFile: HttpFile;
  variables: Variables;
}