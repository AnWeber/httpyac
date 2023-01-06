import * as models from '../../models';
import { toMultiLineString } from '../../utils';
import { IntellijAction, IntellijScriptData } from './intellijAction';

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
  const intellijContent = getIntellijContent(lineReader, !!httpRegion.request);

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
  return false;
}

function getIntellijContent(lineReader: models.HttpLineGenerator, hasRequest: boolean): IntelliJParserResult | false {
  let next = lineReader.next();
  if (!next.done) {
    const startLine = next.value.line;

    const fileMatches = /^\s*(?<event>(<|>))\s+(?<fileName>[^\s{%}]+\s*)$/u.exec(next.value.textLine);
    if (fileMatches?.groups?.fileName) {
      if (fileMatches.groups.event === '<' && hasRequest) {
        return false;
      }
      return {
        startLine,
        endLine: startLine,
        endOffset: next.value.textLine.length,
        data: {
          fileName: fileMatches.groups.fileName.trim(),
        },
      };
    }

    const singleLineMatch = /^\s*(?<event>(<|>))\s+\{%\s*(?<script>.*)\s*%\}\s*$/u.exec(next.value.textLine);
    if (singleLineMatch?.groups?.script) {
      if (singleLineMatch.groups.event === '<' && hasRequest) {
        return false;
      }
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

    const multiLineMatch = /^\s*(?<event>(<|>))\s+\{%\s*$/u.exec(next.value.textLine);
    if (multiLineMatch?.groups?.event) {
      if (multiLineMatch.groups.event === '<' && hasRequest) {
        return false;
      }
      next = lineReader.next();
      const scriptLines: Array<string> = [];
      while (!next.done) {
        if (/^\s*%\}\s*$/u.test(next.value.textLine)) {
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
