
import { HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult } from '../models';
import { toMultiLineString } from '../utils';


export class CommentHttpRegionParser implements HttpRegionParser{

  noStopOnMetaTag: boolean = true;
  async parse(lineReader: HttpRegionParserGenerator): Promise<HttpRegionParserResult> {
    const comment = getCommentContent(lineReader);
    if (comment) {
      return {
        endLine: comment.endLine,
        symbols: [{
          name: 'comment',
          description: comment.comment,
          kind: HttpSymbolKind.commnet,
          startLine: comment.startLine,
          startOffset: 0,
          endLine: comment.endLine,
          endOffset: 0,
        }],
      };
    };
    return false;
  }
}


export interface CommentParserResult{
  startLine: number,
  endLine: number,
  comment: string;
}


function getCommentContent(lineReader: HttpRegionParserGenerator): CommentParserResult | false {
  let next = lineReader.next();
  if (!next.done) {

    const startLine = next.value.line;


    const singleLineMatch = /^\s*\/\/\s*(?<comment>.*)\s*$/.exec(next.value.textLine);
    if (singleLineMatch?.groups?.comment) {
      return {
        startLine,
        endLine: startLine,
        comment: singleLineMatch.groups.comment
      };
    }

    const multiLineMatch = /^\s*\/\*$/.exec(next.value.textLine);
    if (multiLineMatch) {
      let next = lineReader.next();
      const lines: Array<string> = [];
      while (!next.done) {
        if (/^\s*\*\/\s*$/.test(next.value.textLine)) {
          return {
            startLine,
            endLine: next.value.line,
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