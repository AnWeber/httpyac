import { HttpFile, HttpRegion, HttpSymbolKind, ParserContext } from '../models';
import { toMultiLineString, toMultiLineArray} from '../utils';
import { environmentStore } from '../environments/environmentStore';
import { httpYacApi } from '../httpYacApi';


export async function parseHttpFile(text: string, fileName: string): Promise<HttpFile> {

  const httpFile: HttpFile = {
    httpRegions: [],
    fileName,
    environments: {},
    activeEnvironment: environmentStore.activeEnvironments,
  };
  const lines = toMultiLineArray(text);

  const parserContext: ParserContext = {
    httpFile,
    httpRegion: initHttpRegion(0),
    data: {}
  };
  for (let line = 0; line < lines.length; line++) {

    const isLineEmpty = /^\s*$/.test(lines[line]);
    for (const httpRegionParser of httpYacApi.httpRegionParsers) {
      if (!isLineEmpty || httpRegionParser.supportsEmptyLine && isLineEmpty) {
        const httpRegionParserResult = await httpRegionParser.parse(createReader(line, lines, !!httpRegionParser.noStopOnMetaTag), parserContext);
        if (httpRegionParserResult) {
          if (httpRegionParserResult.newRegion) {
            parserContext.httpRegion.symbol.endLine = httpRegionParserResult.endLine;
            closeHttpRegion(parserContext);
            parserContext.httpRegion = initHttpRegion(httpRegionParserResult.endLine + 1);
          }
          if (httpRegionParserResult.symbols) {
            if (parserContext.httpRegion.symbol.children) {
              parserContext.httpRegion.symbol.children.push(...httpRegionParserResult.symbols);
            } else {
              parserContext.httpRegion.symbol.children = httpRegionParserResult.symbols;
            }
          }
          line = httpRegionParserResult.endLine;
          break;
        }
      }
    }
  }
  closeHttpRegion(parserContext);
  parserContext.httpRegion.symbol.endLine = lines.length - 1;
  setSource(httpFile.httpRegions, lines);
  return httpFile;
}

function closeHttpRegion(parserContext: ParserContext) {
  for (const obj of httpYacApi.httpRegionParsers) {
    if (obj.close) {
      obj.close(parserContext);
    }
  };
  const requestName = parserContext.httpRegion.symbol.children?.find(obj => obj.kind === HttpSymbolKind.requestLine)?.name || 'global';
  parserContext.httpRegion.symbol.name = parserContext.httpRegion.metaData.name || requestName;
  parserContext.httpRegion.symbol.description = requestName;
  parserContext.httpFile.httpRegions.push(parserContext.httpRegion);
}

function setSource(httpRegions: Array<HttpRegion>, lines: Array<string>) {
  for (const httpRegion of httpRegions) {
    httpRegion.source = toMultiLineString(lines.slice(httpRegion.symbol.startLine, httpRegion.symbol.endLine));
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

function* createReader(startLine: number, lines: Array<string>, noStopOnMetaTag: boolean) {
  for (let line = startLine; line < lines.length; line++) {
    const textLine = lines[line];
    yield {
      textLine,
      line
    };
    if (!noStopOnMetaTag) {
      // if parser region is not closed stop at delimiter
      if (/^\s*\#{3,}/.test(textLine)) {
        break;
      }
    }
  }
}


