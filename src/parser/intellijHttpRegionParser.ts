import { IntellijScriptData, IntellijAction } from '../actions';
import * as models from '../models';
import { toMultiLineString } from '../utils';
import { ParserRegex } from './parserRegex';

export interface IntelliJParserResult {
  startLine: number;
  endLine: number;
  endOffset: number;
  data: models.ScriptData | IntellijScriptData;
}

export async function parseIntellijScript(
  getLineReader: models.getHttpLineGenerator,
  { httpRegion }: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  if (httpRegion.request) {
    const intellijContent = getIntellijContent(lineReader);

    if (intellijContent) {
      httpRegion.hooks.execute.addObjHook(obj => obj.process, new IntellijAction(intellijContent.data));
      return {
        nextParserLine: intellijContent.endLine,
        symbols: [
          {
            name: 'Intellij Script',
            description: 'Intellij Script',
            kind: models.HttpSymbolKind.script,
            startLine: intellijContent.startLine,
            startOffset: 0,
            endLine: intellijContent.endLine,
            endOffset: intellijContent.endOffset,
          },
        ],
      };
    }
  }
  return false;
}

function getIntellijContent(lineReader: models.HttpLineGenerator): IntelliJParserResult | false {
  let next = lineReader.next();
  if (!next.done) {
    const startLine = next.value.line;

    const fileMatches = ParserRegex.intellij.import.exec(next.value.textLine);
    if (fileMatches?.groups?.fileName) {
      return {
        startLine,
        endLine: startLine,
        endOffset: next.value.textLine.length,
        data: {
          fileName: fileMatches.groups.fileName,
        },
      };
    }

    const singleLineMatch = ParserRegex.intellij.scriptSingleLine.exec(next.value.textLine);
    if (singleLineMatch?.groups?.script) {
      return {
        startLine,
        endLine: startLine,
        endOffset: next.value.textLine.length,
        data: {
          script: singleLineMatch.groups.script,
          lineOffset: startLine,
        },
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
            endOffset: next.value.textLine.length,
            data: {
              script: toMultiLineString(scriptLines),
              lineOffset: startLine,
            },
          };
        }
        scriptLines.push(next.value.textLine);
        next = lineReader.next();
      }
    }
  }
  return false;
}
