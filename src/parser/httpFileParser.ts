import * as models from '../models';
import { HttpFileStore } from '../store';
import * as utils from '../utils';
import { ParserRegex } from './parserRegex';

export async function parseHttpFile(
  httpFile: models.HttpFile,
  text: string,
  httpFileStore: HttpFileStore
): Promise<models.HttpFile> {
  const lines = utils.toMultiLineArray(text);

  const parserContext: models.ParserContext = {
    lines,
    httpFile,
    httpRegion: initHttpRegion(0),
    data: {},
    httpFileStore,
  };

  for (let line = 0; line < lines.length; line++) {
    const httpRegionParserResult = await httpFile.hooks.parse.trigger(createReaderFactory(line, lines), parserContext);
    if (httpRegionParserResult && httpRegionParserResult !== models.HookCancel) {
      if (httpRegionParserResult.endRegionLine !== undefined && httpRegionParserResult.endRegionLine >= 0) {
        parserContext.httpRegion.symbol.endLine = httpRegionParserResult.endRegionLine;
        parserContext.httpRegion.symbol.endOffset = lines[httpRegionParserResult.endRegionLine].length;
        await closeHttpRegion(parserContext);
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
    }
  }

  await closeHttpRegion(parserContext);
  parserContext.httpRegion.symbol.endLine = lines.length - 1;
  parserContext.httpRegion.symbol.endOffset = lines[lines.length - 1].length;
  setSource(httpFile.httpRegions, lines);
  return httpFile;
}

async function closeHttpRegion(parserContext: models.ParserContext): Promise<void> {
  await parserContext.httpFile.hooks.parseEndRegion.trigger(parserContext);

  const { httpRegion } = parserContext;
  parserContext.httpRegion.symbol.name = utils.getDisplayName(httpRegion);
  parserContext.httpRegion.symbol.description = utils.getRegionDescription(httpRegion);
  parserContext.httpFile.httpRegions.push(parserContext.httpRegion);
}

function setSource(httpRegions: Array<models.HttpRegion>, lines: Array<string>) {
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

function initHttpRegion(start: number): models.HttpRegion {
  return {
    metaData: {},
    symbol: {
      name: '-',
      description: '-',
      kind: models.HttpSymbolKind.request,
      startLine: start,
      startOffset: 0,
      endLine: start,
      endOffset: 0,
    },
    hooks: {
      execute: new models.ExecuteHook(),
      onRequest: new models.OnRequestHook(),
      onStreaming: new models.OnStreaming(),
      onResponse: new models.OnResponseHook(),
      responseLogging: new models.ResponseLoggingHook(),
    },
    variablesPerEnv: {},
  };
}

function createReaderFactory(startLine: number, lines: Array<string>) {
  return function* createReader(noStopOnMetaTag?: boolean) {
    for (let line = startLine; line < lines.length; line++) {
      const textLine = lines[line];
      yield {
        textLine,
        line,
      };
      if (!noStopOnMetaTag) {
        // if parser region is not closed stop at delimiter
        if (ParserRegex.meta.delimiter.test(textLine)) {
          break;
        }
      }
    }
  };
}
