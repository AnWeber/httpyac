
import { HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext, HttpFile, ActionProcessorType } from '../models';

import { intellijActionProcessor, IntellijScriptData } from '../actionProcessor';



export class IntellijFileHttpRegionParser implements HttpRegionParser{
  async parse(lineReader: HttpRegionParserGenerator, { httpRegion, httpFile }: ParserContext): Promise<HttpRegionParserResult> {
    if (httpRegion.request) {
      let next = lineReader.next();

      if (!next.done) {
        const match = /^\s*>\s+(?<file>[^\s{%}]+\s*)$/.exec(next.value.textLine);
        if (!!match?.groups?.file) {

          const data: IntellijScriptData = {
            fileName: match.groups.file
          };
          httpRegion.actions.push(
            {
              data,
              type: ActionProcessorType.intellij,
              processor: intellijActionProcessor,
            }
          );
          return {
            endLine: next.value.line,
            symbols: [{
              name: 'Intellij Script',
              description: 'Intellij Script',
              kind: HttpSymbolKind.script,
              startLine: next.value.line,
              startOffset: 0,
              endLine: next.value.line,
              endOffset: 0,
            }],
          };
        }
      }
    }
    return false;
  }


}