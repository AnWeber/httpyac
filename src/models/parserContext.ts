import { HttpFileStore } from '../store';
import { HttpFile } from './httpFile';
import { HttpRegion } from './httpRegion';
import { ParserContextData } from './parserContextData';


export type HttpLineGenerator = Generator<{ textLine: string; line: number; }, void, unknown>;

export type getHttpLineGenerator = (noStopOnMetaTag?: boolean) => HttpLineGenerator;


export interface ParserContext{
  lines: Array<string>;
  httpRegion: HttpRegion;
  httpFile: HttpFile;
  data: ParserContextData;
  httpFileStore: HttpFileStore;
}
