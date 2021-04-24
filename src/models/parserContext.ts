import { HttpFile } from './httpFile';
import { HttpRegion } from './httpRegion';
import { ParserContextData } from './parserContextData';


export interface ParserContext{
  httpRegion: HttpRegion;
  httpFile: HttpFile;
  data: ParserContextData;
}
