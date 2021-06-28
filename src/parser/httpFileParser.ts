import { HttpFile, HttpRegion, HttpSymbol, HttpSymbolKind, ParserContext } from '../models';
import { toMultiLineString, toMultiLineArray, getRegionName } from '../utils';
import { environmentStore } from '../environments/environmentStore';
import { httpYacApi } from '../httpYacApi';
import { HttpFileStore } from '../httpFileStore';
import { ParserRegex } from './parserRegex';
import { PathLike } from '../fileProvider';


export async function parseHttpFile(text: string, fileName: PathLike, httpFileStore: HttpFileStore): Promise<HttpFile> {

  const httpFile: HttpFile = {
    httpRegions: [],
    fileName,
    variablesPerEnv: {},
    activeEnvironment: environmentStore.activeEnvironments,
  };
  const lines = toMultiLineArray(text);

  const parserContext: ParserContext = {
    httpFile,
    httpRegion: initHttpRegion(0),
    data: {},
    httpFileStore,
    environmentConfig: environmentStore.environmentConfig,
  };
  for (let line = 0; line < lines.length; line++) {

    const isLineEmpty = ParserRegex.emptyLine.test(lines[line]);
    for (const httpRegionParser of httpYacApi.httpRegionParsers) {
      if (!isLineEmpty || httpRegionParser.supportsEmptyLine && isLineEmpty) {
        const httpRegionParserResult = await httpRegionParser.parse(createReader(line, lines, !!httpRegionParser.noStopOnMetaTag), parserContext);
        if (httpRegionParserResult) {
          if (httpRegionParserResult.endRegionLine !== undefined && httpRegionParserResult.endRegionLine >= 0) {
            parserContext.httpRegion.symbol.endLine = httpRegionParserResult.endRegionLine;
            parserContext.httpRegion.symbol.endOffset = lines[httpRegionParserResult.endRegionLine].length;
            closeHttpRegion(parserContext);
            parserContext.httpRegion = initHttpRegion(httpRegionParserResult.nextParserLine + 1);
          }
          if (httpRegionParserResult.symbols) {
            if (parserContext.httpRegion.symbol.children) {
              parserContext.httpRegion.symbol.children.push(...httpRegionParserResult.symbols);
            } else {
              parserContext.httpRegion.symbol.children = httpRegionParserResult.symbols;
            }
          }
          line = httpRegionParserResult.nextParserLine;
          break;
        }
      }
    }
  }
  closeHttpRegion(parserContext);
  parserContext.httpRegion.symbol.endLine = lines.length - 1;
  parserContext.httpRegion.symbol.endOffset = lines[lines.length - 1].length;
  setSource(httpFile.httpRegions, lines);
  return httpFile;
}

function closeHttpRegion(parserContext: ParserContext) {
  for (const obj of httpYacApi.httpRegionParsers) {
    if (obj.close) {
      obj.close(parserContext);
    }
  }
  parserContext.httpRegion.symbol.name = getRegionName(parserContext.httpRegion);
  if (parserContext.httpRegion.request) {
    parserContext.httpRegion.symbol.description = `${parserContext.httpRegion.request.method} ${parserContext.httpRegion.request.url}`;
  } else {
    parserContext.httpRegion.symbol.description = '-';
  }
  parserContext.httpFile.httpRegions.push(parserContext.httpRegion);
}

function setSource(httpRegions: Array<HttpRegion>, lines: Array<string>) {
  for (const httpRegion of httpRegions) {
    setSymbolSource(httpRegion.symbol, lines);
  }
}

function setSymbolSource(symbol: HttpSymbol, lines: Array<string>): void {
  symbol.source = toMultiLineString(lines.slice(symbol.startLine, symbol.endLine + 1));
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

function initHttpRegion(start: number): HttpRegion {
  return {
    actions: [],
    metaData: {},
    symbol: {
      name: '-',
      description: '-',
      kind: HttpSymbolKind.request,
      startLine: start,
      startOffset: 0,
      endLine: start,
      endOffset: 0,
    }
  };
}

function *createReader(startLine: number, lines: Array<string>, noStopOnMetaTag: boolean) {
  for (let line = startLine; line < lines.length; line++) {
    const textLine = lines[line];
    yield {
      textLine,
      line
    };
    if (!noStopOnMetaTag) {

      // if parser region is not closed stop at delimiter
      if (ParserRegex.meta.delimiter.test(textLine)) {
        break;
      }
    }
  }
}
