import { HttpRegion } from '../httpRegion';

export type HttpRegionParserGenerator = Generator<{ textLine: string; line: number; }, void, unknown>;

export type HttpRegionParserResult = { newRegion?: boolean; endLine: number } | false;

export interface HttpRegionParser{
  parse(lineReader: HttpRegionParserGenerator, httpRegion: HttpRegion,fileName: string): Promise<HttpRegionParserResult>;


  close?(httpRegion: HttpRegion): void;
  reset?(): void;
}