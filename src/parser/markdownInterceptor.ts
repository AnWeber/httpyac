import { fileProvider } from '../io';
import * as models from '../models';
import { ParserRegex } from './parserRegex';
import { HookInterceptor, HookTriggerContext } from 'hookpoint';

export class MarkdownInterceptor
  implements HookInterceptor<[models.getHttpLineGenerator, models.ParserContext], undefined>
{
  private BeginHttpBlock = /^```\s*(http|rest)$/iu;
  private EndHttpBlock = /^```\s*$/u;

  async beforeTrigger(
    hookContext: HookTriggerContext<[models.getHttpLineGenerator, models.ParserContext], undefined>
  ): Promise<boolean | undefined> {
    const getLineReader = hookContext.args[0];
    const context = hookContext.args[1];

    if (fileProvider.hasExtension(context.httpFile.fileName, 'md')) {
      const httpBlockLines = this.getHttpBlockLines(context.lines, context.data);
      hookContext.args[0] = function* createReader(noStopOnMetaTag?: boolean) {
        if (httpBlockLines.length > 0) {
          const lineReader = getLineReader(true);
          for (const line of lineReader) {
            const httpBlock = httpBlockLines.find(obj => obj.startLine <= line.line && line.line < obj.endLine);
            if (httpBlock) {
              if (httpBlock.startLine === line.line) {
                yield {
                  line: line.line,
                  textLine: '###',
                };
              } else {
                if (!noStopOnMetaTag && ParserRegex.meta.delimiter.test(line.textLine)) {
                  // if parser region is not closed stop at delimiter
                  break;
                }
                yield line;
              }
            } else break;
          }
        }
      };
    }

    return true;
  }

  private getHttpBlockLines(lines: Array<string>, data: models.ParserContextData) {
    if (data?.markdownHttpBlocks) {
      return data.markdownHttpBlocks;
    }
    const result: Array<{
      startLine: number;
      endLine: number;
    }> = [];
    let startLine = -1;
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      const textLine = lines[lineNumber];
      if (startLine < 0) {
        if (this.BeginHttpBlock.test(textLine)) {
          startLine = lineNumber;
        }
      } else {
        if (this.EndHttpBlock.test(textLine)) {
          result.push({
            startLine,
            endLine: lineNumber,
          });
          startLine = -1;
        }
      }
    }
    data.markdownHttpBlocks = result;
    return result;
  }
}
