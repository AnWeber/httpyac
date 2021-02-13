
import { HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext } from '../models';
import { toMultiLineString } from '../utils';
import { jsActionProcessor, ScriptData } from '../actionProcessor';


export class JsHttpRegionParser implements HttpRegionParser{
  async parse(lineReader: HttpRegionParserGenerator, { httpRegion }: ParserContext): Promise<HttpRegionParserResult> {
    let next = lineReader.next();

    if (!next.done) {
      const matches = /^\s*{{\s*$/.exec(next.value.textLine);
      if (!matches) {
        return false;
      }
      const lineOffset = next.value.line;
      next = lineReader.next();
      const script: Array<string> = [];
      while (!next.done) {

        if (/^\s*}}\s*$/.test(next.value.textLine)) {
          const data: ScriptData = {
            script: toMultiLineString(script),
            lineOffset,
          };
          httpRegion.actions.push(
            {
              data,
              type: 'js',
              processor: jsActionProcessor,
            }
          );

          return {
            endLine: next.value.line,
            symbols: [{
              name: "script",
              description: "nodejs script",
              kind: HttpSymbolKind.script,
              startLine: lineOffset,
              startOffset: 0,
              endLine: next.value.line,
              endOffset: 0,
            }]
          };
        }
        script.push(next.value.textLine);
        next = lineReader.next();
      }
    }
    return false;
  }
}