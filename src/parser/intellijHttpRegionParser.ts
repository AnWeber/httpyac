
import { HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext } from '../models';
import { toMultiLineString } from '../utils';
import { ScriptData, IntellijScriptData, IntellijAction } from '../actions';


export interface IntelliJParserResult{
  startLine: number,
  endLine: number,
  data: ScriptData | IntellijScriptData;
}


export class IntellijHttpRegionParser implements HttpRegionParser{
  async parse(lineReader: HttpRegionParserGenerator, { httpRegion }: ParserContext): Promise<HttpRegionParserResult> {
    if (httpRegion.request) {

      const intellijContent = getIntellijContent(lineReader);

      if (intellijContent) {
        httpRegion.actions.push(new IntellijAction(intellijContent.data));
        return {
          endLine: intellijContent.endLine,
          symbols: [{
            name: 'Intellij Script',
            description: 'Intellij Script',
            kind: HttpSymbolKind.script,
            startLine: intellijContent.startLine,
            startOffset: 0,
            endLine: intellijContent.endLine,
            endOffset: 0,
          }],
        };
      }
    }
    return false;
  }
}



function getIntellijContent(lineReader: HttpRegionParserGenerator): IntelliJParserResult | false {
  let next = lineReader.next();
  if (!next.done) {

    const startLine = next.value.line;

    const fileMatches = /^\s*>\s+(?<fileName>[^\s{%}]+\s*)$/.exec(next.value.textLine);
    if (fileMatches?.groups?.fileName) {
      return {
        startLine,
        endLine: startLine,
        data: {
          fileName: fileMatches.groups.fileName
        }
      };
    }

    const singleLineMatch = /^\s*>\s+{%\s*(?<script>.*)\s*%}\s*$/.exec(next.value.textLine);
    if (singleLineMatch?.groups?.script) {
      return {
        startLine,
        endLine: startLine,
        data: {
          script: singleLineMatch.groups.script,
          lineOffset: startLine,
        }
      };
    }

    const multiLineMatch = /^\s*>\s+{%\s*$/.exec(next.value.textLine);
    if (multiLineMatch) {
      next = lineReader.next();
      const scriptLines: Array<string> = [];
      while (!next.done) {
        if (/^\s*%}\s*$/.test(next.value.textLine)) {
          return {
            startLine,
            endLine: next.value.line,
            data: {
              script: toMultiLineString(scriptLines),
              lineOffset: startLine
            }
          };
        }
        scriptLines.push(next.value.textLine);
        next = lineReader.next();
      }

    }
  }
  return false;
}