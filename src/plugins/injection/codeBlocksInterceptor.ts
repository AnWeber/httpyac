import { HookInterceptor, HookTriggerContext } from 'hookpoint';

import { fileProvider } from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';

export abstract class CodeBlockInterceptor
  implements HookInterceptor<[models.getHttpLineGenerator, models.ParserContext], undefined>
{
  abstract get id(): string;
  constructor(
    private readonly extensions: Array<string>,
    private readonly beginCodeBlock: RegExp | Array<RegExp>,
    private readonly endCodeBlock: RegExp
  ) {}

  async beforeTrigger(
    hookContext: HookTriggerContext<[models.getHttpLineGenerator, models.ParserContext], undefined>
  ): Promise<boolean | undefined> {
    const getLineReader = hookContext.args[0];
    const context = hookContext.args[1];

    if (fileProvider.hasExtension(context.httpFile.fileName, ...this.extensions)) {
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
                if (!noStopOnMetaTag && utils.RegionSeparator.test(line.textLine)) {
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
    if (data.codeBlocks) {
      return data.codeBlocks;
    }
    const result: Array<{
      startLine: number;
      endLine: number;
    }> = [];
    let startLine = -1;
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      const textLine = lines[lineNumber];
      if (startLine < 0) {
        if (Array.isArray(this.beginCodeBlock)) {
          if (
            lines.length > lineNumber + this.beginCodeBlock.length &&
            this.beginCodeBlock.every((regex, index) => regex.test(lines[lineNumber + index]))
          ) {
            startLine = lineNumber + this.beginCodeBlock.length - 1;
            lineNumber += this.beginCodeBlock.length - 1;
          }
        } else if (this.beginCodeBlock.test(textLine)) {
          startLine = lineNumber;
        }
      } else {
        if (this.endCodeBlock.test(textLine)) {
          result.push({
            startLine,
            endLine: lineNumber,
          });
          startLine = -1;
        }
      }
    }
    data.codeBlocks = result;
    return result;
  }
}
