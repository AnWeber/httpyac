
import { HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult } from '../models';
import { toMultiLineString } from '../utils';


export class CommentHttpRegionParser implements HttpRegionParser{

  noStopOnMetaTag: boolean = true;
  async parse(lineReader: HttpRegionParserGenerator): Promise<HttpRegionParserResult> {
    let next = lineReader.next();

    if (!next.done) {
      const matches = /^\s*\/\*.*$/.exec(next.value.textLine);
      if (!matches) {
        return false;
      }
      const lineOffset = next.value.line;
      next = lineReader.next();
      const lines: Array<string> = [];
      while (!next.done) {

        if (/^\s*\*\/\s*$/.test(next.value.textLine)) {
          return {
            endLine: next.value.line,
            symbols: [{
              name: "comment",
              description: toMultiLineString(lines),
              kind: HttpSymbolKind.commnet,
              startLine: lineOffset,
              startOffset: 0,
              endLine: next.value.line,
              endOffset: 0,
            }]
          };
        }
        lines.push(next.value.textLine);
        next = lineReader.next();
      }
    }
    return false;
  }
}