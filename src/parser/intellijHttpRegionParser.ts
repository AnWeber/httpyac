import { HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext } from '../models';
import { toMultiLineString } from '../utils';
import { ScriptData, IntellijScriptData, IntellijAction } from '../actions';
import { ParserRegex } from './parserRegex';


export interface IntelliJParserResult{
  startLine: number,
  endLine: number,
  data: ScriptData | IntellijScriptData;
}


export class IntellijHttpRegionParser implements HttpRegionParser {
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

    const fileMatches = ParserRegex.intellij.import.exec(next.value.textLine);
    if (fileMatches?.groups?.fileName) {
      return {
        startLine,
        endLine: startLine,
        data: {
          fileName: fileMatches.groups.fileName
        }
      };
    }

    const singleLineMatch = ParserRegex.intellij.scriptSingleLine.exec(next.value.textLine);
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

    const multiLineMatch = ParserRegex.intellij.scriptStart.exec(next.value.textLine);
    if (multiLineMatch) {
      next = lineReader.next();
      const scriptLines: Array<string> = [];
      while (!next.done) {
        if (ParserRegex.intellij.scriptEnd.test(next.value.textLine)) {
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
