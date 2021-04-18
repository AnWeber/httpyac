import { HttpFile } from './httpFile';
import { HttpRegion } from './httpRegion';

export interface ParserContext{
  httpRegion: HttpRegion;
  httpFile: HttpFile;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string,any>;
}