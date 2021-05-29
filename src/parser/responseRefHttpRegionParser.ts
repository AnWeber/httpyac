import { HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext } from '../models';
import { ParserRegex } from './parserRegex';

export class ResponseRefHttpRegionParser implements HttpRegionParser {

  async parse(lineReader: HttpRegionParserGenerator, { httpRegion }: ParserContext): Promise<HttpRegionParserResult> {
    const next = lineReader.next();
    if (!next.done) {
      const textLine = next.value.textLine;

      const match = ParserRegex.responseRef.exec(textLine);
      if (match && match.groups?.fileName) {
        if (!httpRegion.responseRefs) {
          httpRegion.responseRefs = [match.groups.fileName];
        } else {
          httpRegion.responseRefs.push(match.groups.fileName);
        }
        return {
          nextParserLine: next.value.line,
          symbols: [{
            name: match.groups.key,
            description: match.groups.value,
            kind: HttpSymbolKind.response,
            startLine: next.value.line,
            startOffset: 0,
            endLine: next.value.line,
            endOffset: next.value.textLine.length,
          }],
        };
      }
    }
    return false;
  }
}
