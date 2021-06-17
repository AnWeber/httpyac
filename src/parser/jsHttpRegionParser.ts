import { HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext, ActionType } from '../models';
import { toMultiLineString, pushAfter } from '../utils';
import { JavascriptAction, ScriptData } from '../actions';
import { ParserRegex } from './parserRegex';

export class JsHttpRegionParser implements HttpRegionParser {
  async parse(lineReader: HttpRegionParserGenerator, { httpRegion, data }: ParserContext): Promise<HttpRegionParserResult> {
    let next = lineReader.next();

    if (!next.done) {
      const match = ParserRegex.javascript.scriptStart.exec(next.value.textLine);
      if (!match) {
        return false;
      }
      const lineOffset = next.value.line;
      next = lineReader.next();
      const script: Array<string> = [];
      while (!next.done) {

        if (ParserRegex.javascript.scriptEnd.test(next.value.textLine)) {
          const scriptData: ScriptData = {
            script: toMultiLineString(script),
            lineOffset,
          };

          if (!match.groups?.executeOnEveryRequest) {
            httpRegion.actions.push(new JavascriptAction(scriptData));
          } else {

            let onEveryRequestArray = data.jsOnEveryRequest;
            if (!onEveryRequestArray) {
              data.jsOnEveryRequest = onEveryRequestArray = [];
            }
            onEveryRequestArray.push({
              scriptData,
              postScript: ['+after', '+post'].indexOf(match.groups?.executeOnEveryRequest) >= 0,
            });
          }

          return {
            nextParserLine: next.value.line,
            symbols: [{
              name: 'script',
              description: 'nodejs script',
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

  close({ data, httpRegion }: ParserContext): void {
    const onEveryRequestArray = data.jsOnEveryRequest;
    if (onEveryRequestArray && httpRegion.request) {
      for (const everyRequestScript of onEveryRequestArray) {
        if (everyRequestScript.postScript) {
          httpRegion.actions.push(new JavascriptAction(everyRequestScript.scriptData));
        } else {
          pushAfter(httpRegion.actions, obj => obj.type === ActionType.requestBodyImport, new JavascriptAction(everyRequestScript.scriptData));
        }
      }
    }
  }
}
