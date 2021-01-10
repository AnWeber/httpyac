import { HttpFile, HttpRegion } from '../httpRegion';
import { toMultiLineString, toMultiLineArray} from '../utils';
import { environmentStore } from '../environments/environmentStore';
import { httpYacApi } from '../httpYacApi';


export async function parseHttpFile(text: string, fileName: string): Promise<HttpFile> {

  try {
    const httpFile: HttpFile = {
      httpRegions: [],
      fileName,
      variables: {},
      env: environmentStore.activeEnvironments,
    };
    const lines = toMultiLineArray(text);
    let httpRegion: HttpRegion = initHttpRegion(0);
    for (let line = 0; line < lines.length; line++) {
      for (const httpRegionParser of httpYacApi.httpRegionParsers) {
        const httpRegionParserResult = await httpRegionParser.parse(createReader(line, lines), httpRegion, httpFile);
        if (httpRegionParserResult) {
          if (httpRegionParserResult.newRegion) {

            for (const obj of httpYacApi.httpRegionParsers) {
              if (obj.close) {
                obj.close(httpRegion);
              }
            };
            httpFile.httpRegions.push(httpRegion);
            httpRegion = initHttpRegion(httpRegionParserResult.endLine + 1);
          }
          line = httpRegionParserResult.endLine;
          break;
        }
      }
    }
    httpRegion.position.end = lines.length - 1;
    httpFile.httpRegions.push(httpRegion);


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

function setSource(httpRegions: Array<HttpRegion>, lines: Array<string>) {
  for (const httpRegion of httpRegions) {
    httpRegion.source = toMultiLineString(lines.slice(httpRegion.position.start, httpRegion.position.end));
  }
}

function initHttpRegion(start: number, end?: number): HttpRegion {
  return {
    actions: [],
    metaParams: {},
    position: {
      start,
      end: end || start,
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


