import { HttpRegion, HttpFile, HttpRegionParserResult} from '../models';

export type HttpRegionParserGenerator = Generator<{ textLine: string; line: number; }, void, unknown>;

export interface HttpRegionParser{
  parse(lineReader: HttpRegionParserGenerator, httpRegion: HttpRegion, httpFile: HttpFile): Promise<HttpRegionParserResult>;


  close?(httpRegion: HttpRegion): void;
  reset?(): void;
}