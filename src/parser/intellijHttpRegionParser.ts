
import { HttpRegion, HttpFile, HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult } from '../models';
import { toMultiLineString } from '../utils';
import { ScriptData, intellijActionProcessor } from '../actionProcessor';


export class IntellijHttpRegionParser implements HttpRegionParser{
  async parse(lineReader: HttpRegionParserGenerator, httpRegion: HttpRegion, httpFile: HttpFile): Promise<HttpRegionParserResult> {
    if (httpRegion.request) {
      let next = lineReader.next();

      if (!next.done) {
        const matches = /^\s*>\s+{%?\s*$/.exec(next.value.textLine);
        if (!matches) {
          return false;
        }
        const lineOffset = next.value.line;
        next = lineReader.next();
        const script: Array<string> = [];
        while (!next.done) {

          if (/^\s*%}\s*$/.test(next.value.textLine)) {
            const data: ScriptData = {
              script: toMultiLineString(script),
              lineOffset,
            };
            httpRegion.actions.push(
              {
                data,
                type: 'intellij',
                processor: intellijActionProcessor,
              }
            );
            return {
              endLine: next.value.line,
              symbols: [{
                name: 'Intellij Script',
                description: 'Intellij Script',
                kind: HttpSymbolKind.script,
                startLine: lineOffset,
                startOffset: 0,
                endLine: next.value.line,
                endOffset: 0,
              }],
            };
          }
          script.push(next.value.textLine);
          next = lineReader.next();
        }
      }
    }
    return false;
  }
}