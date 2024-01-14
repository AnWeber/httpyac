import { HttpSymbolKind } from './httpSymbolKind';

export class HttpSymbol {
  public name: string;
  public description: string;
  public kind: HttpSymbolKind;
  public startLine: number;
  public startOffset: number;
  public endLine: number;
  public endOffset: number;

  public source?: string;
  public children?: Array<HttpSymbol>;

  constructor(options: {
    name: string;
    description: string;
    kind: HttpSymbolKind;
    source?: string;
    startLine: number;
    startOffset: number;
    endLine: number;
    endOffset: number;
    children?: Array<HttpSymbol>;
  }) {
    this.name = options.name;
    this.description = options.description;
    this.kind = options.kind;
    this.startLine = options.startLine;
    this.startOffset = options.startOffset;
    this.endLine = options.endLine;
    this.endOffset = options.endOffset;
    this.children = options.children;
    this.source = options.source;
  }

  public filter(predicate: (symbol: HttpSymbol) => boolean): Array<HttpSymbol> {
    const result: Array<HttpSymbol> = [];
    if (this.children) {
      for (const child of this.children) {
        if (predicate(child)) {
          result.push(child);
        }
        result.push(...child.filter(predicate));
      }
    }
    return result;
  }
}
