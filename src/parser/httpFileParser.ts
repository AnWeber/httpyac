import { HttpFile, HttpRegion, HttpSymbolKind, HttpSymbol } from '../models';
import { toMultiLineString, toMultiLineArray} from '../utils';
import { environmentStore } from '../environments/environmentStore';
import { httpYacApi } from '../httpYacApi';


export async function parseHttpFile(text: string, fileName: string): Promise<HttpFile> {

  try {
    const httpFile: HttpFile = {
      httpRegions: [],
      fileName,
      environments: {},
      activeEnvironment: environmentStore.activeEnvironments,
    };
    const lines = toMultiLineArray(text);
    let httpRegion: HttpRegion = initHttpRegion(0);
    for (let line = 0; line < lines.length; line++) {
      for (const httpRegionParser of httpYacApi.httpRegionParsers) {
        const httpRegionParserResult = await httpRegionParser.parse(createReader(line, lines), httpRegion, httpFile);


        if (httpRegionParserResult) {
          if (httpRegionParserResult.newRegion) {

            httpRegion.symbol.endLine = httpRegionParserResult.endLine;
            closeHttpRegion(httpRegion, httpFile);

            httpRegion = initHttpRegion(httpRegionParserResult.endLine + 1);
          }
          if (httpRegionParserResult.symbols) {
            if (httpRegion.symbol.children) {
              httpRegion.symbol.children.push(...httpRegionParserResult.symbols);
            } else {
              httpRegion.symbol.children = httpRegionParserResult.symbols;
            }
          }
          line = httpRegionParserResult.endLine;
          break;
        }
      }
    }
    closeHttpRegion(httpRegion, httpFile);
    httpRegion.symbol.endLine = lines.length - 1;


    setSource(httpFile.httpRegions, lines);

    return httpFile;
  } finally {
    for (const obj of httpYacApi.httpRegionParsers) {
      if (obj.reset) {
        obj.reset();
      }
    }
  }
}

function closeHttpRegion(httpRegion: HttpRegion, httpFile: HttpFile) {
  for (const obj of httpYacApi.httpRegionParsers) {
    if (obj.close) {
      obj.close(httpRegion);
    }
  };
  const requestName = httpRegion.symbol.children?.find(obj => obj.kind === HttpSymbolKind.requestLine)?.name || 'global';
  httpRegion.symbol.name = httpRegion.metaData.name || requestName;
  httpRegion.symbol.description = requestName;
  httpFile.httpRegions.push(httpRegion);
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

function* createReader(startLine: number, lines: Array<string>) {
  for (let line = startLine; line < lines.length; line++) {
    const textLine = lines[line];
    yield {
      textLine,
      line
    };
    // if parser region is not closed stop at delimiter
    if ( /^\s*\#{3,}/.test(textLine)) {
      break;
    }
  }
}


