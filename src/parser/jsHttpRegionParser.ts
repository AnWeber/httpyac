
import { HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext, ActionProcessorType } from '../models';
import { toMultiLineString } from '../utils';
import { jsActionProcessor, ScriptData } from '../actionProcessor';


const JS_ON_EVERY_REQUEST_IDENTIFIER = 'jsOnEveryRequest';
export class JsHttpRegionParser implements HttpRegionParser{
  async parse(lineReader: HttpRegionParserGenerator, { httpRegion, data }: ParserContext): Promise<HttpRegionParserResult> {
    let next = lineReader.next();

    if (!next.done) {
      const matches = /^\s*{{(?<executeOnEveryRequest>+)?\s*$/.exec(next.value.textLine);
      if (!matches) {
        return false;
      }
      const executeOnEveryRequest = !!matches.groups?.executeOnEveryRequest;
      const lineOffset = next.value.line;
      next = lineReader.next();
      const script: Array<string> = [];
      while (!next.done) {

        if (/^\s*}}\s*$/.test(next.value.textLine)) {
          const scriptData: ScriptData = {
            script: toMultiLineString(script),
            lineOffset,
          };

          if (!executeOnEveryRequest) {
            httpRegion.actions.push(
              {
                data: scriptData,
                type: ActionProcessorType.js,
                processor: jsActionProcessor,
              }
            );
          } else {

            let onEveryRequestArray: ScriptData[] = data[JS_ON_EVERY_REQUEST_IDENTIFIER];
            if (!onEveryRequestArray) {
              data[JS_ON_EVERY_REQUEST_IDENTIFIER] = onEveryRequestArray = [];
            }
            onEveryRequestArray.push(scriptData);
          }

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

  close({data, httpRegion}: ParserContext): void {
    let onEveryRequestArray: ScriptData[] = data[JS_ON_EVERY_REQUEST_IDENTIFIER];
    if (onEveryRequestArray && httpRegion.request) {
      httpRegion.actions.splice(0, 0, ...onEveryRequestArray.map(scriptData => {
        return {
          data: scriptData,
          type: ActionProcessorType.js,
          processor: jsActionProcessor,
        };
      }));

    }
  }
}