
import { HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext, ActionProcessorType } from '../models';
import { toMultiLineString, actionProcessorIndexAfterRequest } from '../utils';
import { jsActionProcessor, ScriptData } from '../actionProcessor';


interface EveryRequestScript { scriptData: ScriptData, postScript: boolean }

const JS_ON_EVERY_REQUEST_IDENTIFIER = 'jsOnEveryRequest';
export class JsHttpRegionParser implements HttpRegionParser {
  async parse(lineReader: HttpRegionParserGenerator, { httpRegion, data }: ParserContext): Promise<HttpRegionParserResult> {
    let next = lineReader.next();

    if (!next.done) {
      const match = /^\s*{{(?<executeOnEveryRequest>\+(pre|post|after)?)?\s*$/.exec(next.value.textLine);
      if (!match) {
        return false;
      }
      const lineOffset = next.value.line;
      next = lineReader.next();
      const script: Array<string> = [];
      while (!next.done) {

        if (/^\s*}}\s*$/.test(next.value.textLine)) {
          const scriptData: ScriptData = {
            script: toMultiLineString(script),
            lineOffset,
          };

          if (!match.groups?.executeOnEveryRequest) {
            httpRegion.actions.push(
              {
                data: scriptData,
                type: ActionProcessorType.js,
                processor: jsActionProcessor,
              }
            );
          } else {

            let onEveryRequestArray: EveryRequestScript[] = data[JS_ON_EVERY_REQUEST_IDENTIFIER];
            if (!onEveryRequestArray) {
              data[JS_ON_EVERY_REQUEST_IDENTIFIER] = onEveryRequestArray = [];
            }
            onEveryRequestArray.push({
              scriptData,
              postScript: ['+after', '+post'].indexOf(match.groups?.executeOnEveryRequest) >=0,
            });
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

  close({ data, httpRegion }: ParserContext): void {
    const onEveryRequestArray: EveryRequestScript[] = data[JS_ON_EVERY_REQUEST_IDENTIFIER];
    if (onEveryRequestArray && httpRegion.request) {
      for (const everyRequestScript of onEveryRequestArray) {
        if (everyRequestScript.postScript) {
          httpRegion.actions.push({
            data: everyRequestScript.scriptData,
            type: ActionProcessorType.js,
            processor: jsActionProcessor,
          });
        } else {
          httpRegion.actions.splice(actionProcessorIndexAfterRequest(httpRegion), 0, {
            data: everyRequestScript.scriptData,
            type: ActionProcessorType.js,
            processor: jsActionProcessor,
          });
        }

      }


    }
  }
}