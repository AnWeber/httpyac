import {
  getHttpLineGenerator,
  HttpLineGenerator,
  HttpRegionParserResult,
  HttpSymbol,
  HttpSymbolKind,
  ParserContext,
} from '../../../models';
import { toMultiLineString } from '../../../utils';

export async function parseComment(
  getLineReader: getHttpLineGenerator,
  { httpRegion }: ParserContext
): Promise<HttpRegionParserResult> {
  const lineReader = getLineReader(true);
  const comment = getCommentContent(lineReader);
  if (comment) {
    if (!httpRegion.metaData.description) {
      // first comment gets description
      httpRegion.metaData.description = comment.comment;
    }
    return {
      nextParserLine: comment.endLine,
      symbols: [
        new HttpSymbol({
          name: 'comment',
          description: comment.comment,
          kind: HttpSymbolKind.comment,
          startLine: comment.startLine,
          startOffset: 0,
          endLine: comment.endLine,
          endOffset: comment.endOffset,
        }),
      ],
    };
  }
  return false;
}

export interface CommentParserResult {
  startLine: number;
  endLine: number;
  endOffset: number;
  comment: string;
}

function getCommentContent(lineReader: HttpLineGenerator): CommentParserResult | false {
  let next = lineReader.next();
  if (!next.done) {
    const startLine = next.value.line;
    const singleLineMatch = /^\s*\/\/\s*(?<comment>.*)\s*$/u.exec(next.value.textLine);
    if (singleLineMatch?.groups?.comment) {
      return {
        startLine,
        endLine: startLine,
        endOffset: next.value.textLine.length,
        comment: singleLineMatch.groups.comment,
      };
    }

    const multiLineMatch = /^\s*\/\*$/u.exec(next.value.textLine);
    if (multiLineMatch) {
      next = lineReader.next();
      const lines: Array<string> = [];
      while (!next.done) {
        if (/^\s*\*\/\s*$/u.test(next.value.textLine)) {
          return {
            startLine,
            endLine: next.value.line,
            endOffset: next.value.textLine.length,
            comment: toMultiLineString(lines),
          };
        }
        lines.push(next.value.textLine);
        next = lineReader.next();
      }
    }
  }
  return false;
}
