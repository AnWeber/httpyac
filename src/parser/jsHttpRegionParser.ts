
import { HttpRegion } from '../httpRegion';
import { HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult } from './httpRegionParser';
import { toMultiLineString } from '../utils';
import { jsActionProcessor, ScriptData, executeScript } from '../actionProcessor/jsActionProcessor';


export class JsHttpRegionParser implements HttpRegionParser{
  async parse(lineReader: HttpRegionParserGenerator, httpRegion: HttpRegion, fileName: string): Promise<HttpRegionParserResult> {
    let next = lineReader.next();

    if (!next.done && this.isScriptStartTag(next.value.textLine)) {
      const lineOffset = next.value.line;
      let processOnlyOnce = this.isScriptStartTagOnlyOnce(next.value.textLine);
      const immediately = this.isScriptStartTagImmediately(next.value.textLine);
      next = lineReader.next();
      const script: Array<string> = [];
      while (!next.done) {

        if (this.isScriptEndTag(next.value.textLine)) {
          if (immediately) {
            await executeScript(toMultiLineString(script),fileName, {}, lineOffset);
          }else{
            const data: ScriptData = {
              script: toMultiLineString(script),
              count: 0,
              lineOffset,
              processOnlyOnce
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

  private isScriptStartTag(textLine: string) {
    return /^\s*{{(=)?\s*$/.test(textLine);
  }
  private isScriptStartTagOnlyOnce(textLine: string) {
    return /^\s*{{=\s*$/.test(textLine);
  }

  private isScriptStartTagImmediately(textLine: string) {
    return /^\s*{{!\s*$/.test(textLine);
  }
  private isScriptEndTag(textLine: string) {
    return /^\s*}}\s*$/.test(textLine);
  }
}