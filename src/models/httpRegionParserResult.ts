import { HttpSymbol } from './httpSymbol';

export interface SymbolParserResult {
  symbols: Array<HttpSymbol>;
}

export interface HttpRegionParserResultValid extends SymbolParserResult {
  endRegionLine?: number;
  nextParserLine: number;
}
export type HttpRegionParserResult = HttpRegionParserResultValid | false;
