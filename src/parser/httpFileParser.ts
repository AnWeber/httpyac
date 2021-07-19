import { HttpFile, HttpRegion, HttpRegionParser, HttpSymbol, HttpSymbolKind, ParseOptions, ParserContext } from '../models';
import * as utils from '../utils';
import { defaultParsers } from './defaultParser';
import { ParserRegex } from './parserRegex';
import { PathLike } from '../io';
import { replacer, provider } from '../variables';

export async function parseHttpFile(fileName: PathLike, text: string, options: ParseOptions): Promise<HttpFile> {

  const rootDir = await utils.findRootDirOfFile(fileName, options.workingDir, options.config?.envDirName || 'env');
  const httpFile: HttpFile = {
    fileName,
    rootDir,
    variableReplacers: [...replacer.defaultVariableReplacers],
    variableProviders: [...provider.defaultVariableProviders],
    httpRegions: [],
    variablesPerEnv: {},
    activeEnvironment: options.activeEnvironment
  };
  const lines = utils.toMultiLineArray(text);

  const parserContext: ParserContext = {
    httpFile,
    httpRegion: initHttpRegion(0),
    data: {},
    httpFileStore: options.httpFileStore,
  };

  const parsers = [...defaultParsers];
  for (let line = 0; line < lines.length; line++) {

    const isLineEmpty = ParserRegex.emptyLine.test(lines[line]);
    for (const httpRegionParser of parsers) {
      if (!isLineEmpty || httpRegionParser.supportsEmptyLine && isLineEmpty) {
        const httpRegionParserResult = await httpRegionParser.parse(createReader(line, lines, !!httpRegionParser.noStopOnMetaTag), parserContext);
        if (httpRegionParserResult) {
          if (httpRegionParserResult.endRegionLine !== undefined && httpRegionParserResult.endRegionLine >= 0) {
            parserContext.httpRegion.symbol.endLine = httpRegionParserResult.endRegionLine;
            parserContext.httpRegion.symbol.endOffset = lines[httpRegionParserResult.endRegionLine].length;
            closeHttpRegion(parserContext, parsers);
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
  closeHttpRegion(parserContext, parsers);
  parserContext.httpRegion.symbol.endLine = lines.length - 1;
  parserContext.httpRegion.symbol.endOffset = lines[lines.length - 1].length;
  setSource(httpFile.httpRegions, lines);
  return httpFile;
}

function closeHttpRegion(parserContext: ParserContext, parsers: Array<HttpRegionParser>) {
  for (const obj of parsers) {
    if (obj.close) {
      obj.close(parserContext);
    }
  }
  const { httpRegion } = parserContext;
  parserContext.httpRegion.symbol.name = utils.getDisplayName(httpRegion);
  parserContext.httpRegion.symbol.description = utils.getRegionDescription(httpRegion);
  parserContext.httpFile.httpRegions.push(parserContext.httpRegion);
}

function setSource(httpRegions: Array<HttpRegion>, lines: Array<string>) {
  for (const httpRegion of httpRegions) {
    setSymbolSource(httpRegion.symbol, lines);
  }
}

function setSymbolSource(symbol: HttpSymbol, lines: Array<string>): void {
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
