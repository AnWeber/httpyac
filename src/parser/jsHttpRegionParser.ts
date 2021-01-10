
import { HttpRegion, HttpFile } from '../httpRegion';
import { HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult } from './httpRegionParser';
import { toMultiLineString } from '../utils';
import { jsActionProcessor, ScriptData, executeScript } from '../actionProcessor/jsActionProcessor';


export class JsHttpRegionParser implements HttpRegionParser{
  async parse(lineReader: HttpRegionParserGenerator, httpRegion: HttpRegion, httpFile: HttpFile): Promise<HttpRegionParserResult> {
    let next = lineReader.next();

    if (!next.done) {
      const matches = /^\s*{{(?<immediately>#)?\s*$/.exec(next.value.textLine);
      if (!matches) {
        return false;
      }
      const lineOffset = next.value.line;
      next = lineReader.next();
      const script: Array<string> = [];
      while (!next.done) {

        if (/^\s*}}\s*$/.test(next.value.textLine)) {
          if (!!matches.groups?.immediately) {
            await executeScript(toMultiLineString(script),httpFile.fileName, {}, lineOffset);
          }else{
            const data: ScriptData = {
              script: toMultiLineString(script),
              lineOffset,
            };
            httpRegion.actions.push(
              {
                data,
                type:'js',
                processor: jsActionProcessor,
              }
            );
          }
          return {
            endLine: next.value.line,
          };
        }
        script.push(next.value.textLine);
        next = lineReader.next();
      }
    }
    return false;
  }
}