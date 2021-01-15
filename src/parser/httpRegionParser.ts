import { HttpRegion, HttpFile, HttpSymbol} from '../httpRegion';

export type HttpRegionParserGenerator = Generator<{ textLine: string; line: number; }, void, unknown>;

export interface HttpRegionParserResultValid {
  newRegion?: boolean;
  endLine: number,
  symbols?: Array<HttpSymbol>
}
export type HttpRegionParserResult = HttpRegionParserResultValid | false;


export interface HttpRegionParser{
  parse(lineReader: HttpRegionParserGenerator, httpRegion: HttpRegion, httpFile: HttpFile): Promise<HttpRegionParserResult>;


  close?(httpRegion: HttpRegion): void;
  reset?(): void;
}