import { HttpSymbol } from './httpSymbol';

export interface HttpRegionParserResultValid {
  newRegion?: boolean;
  endLine: number,
  symbols?: Array<HttpSymbol>
}
export type HttpRegionParserResult = HttpRegionParserResultValid | false;
