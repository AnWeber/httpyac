import { HttpFile } from './httpFile';
import { HttpRegion } from './httpRegion';

export interface ParserContext{
  httpRegion: HttpRegion;
  httpFile: HttpFile;
  data: Record<string,any>;
}