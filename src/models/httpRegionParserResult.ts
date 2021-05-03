import { HttpSymbol } from './httpSymbol';

export interface HttpRegionParserResultValid {
  endRegionLine?: number;
  nextParserLine: number,
  symbols?: Array<HttpSymbol>
}
export type HttpRegionParserResult = HttpRegionParserResultValid | false;
