import { HttpSymbolKind } from './httpSymbolKind';

export interface HttpSymbol {
  name: string;
  description: string;
  kind: HttpSymbolKind;
  source?: string;
  startLine: number;
  startOffset: number;
  endLine: number;
  endOffset: number;
  children?: Array<HttpSymbol>;
}
