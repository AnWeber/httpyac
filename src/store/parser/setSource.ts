import * as models from '../../models';
import * as utils from '../../utils';

export function setSource(httpRegions: Array<models.HttpRegion>, lines: Array<string>) {
  for (const httpRegion of httpRegions) {
    setSymbolSource(httpRegion.symbol, lines);
  }
}

function setSymbolSource(symbol: models.HttpSymbol, lines: Array<string>): void {
  symbol.source = utils.toMultiLineString(lines.slice(symbol.startLine, symbol.endLine + 1));
  let endOffset: number | undefined = symbol.endOffset - lines[symbol.endLine].length;
  if (endOffset >= 0) {
    endOffset = undefined;
  }
  symbol.source = symbol.source.slice(symbol.startOffset, endOffset);
  if (symbol.children) {
    for (const child of symbol.children) {
      setSymbolSource(child, lines);
    }
  }
}
