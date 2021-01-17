import { HttpSymbolKind } from './httpSymbolKind';

export interface HttpSymbol{
  name: string;
  description: string;
  kind: HttpSymbolKind,
  startLine: number;
  startOffset: number;
  endLine: number;
  endOffset: number;
  children?: Array<HttpSymbol>
}