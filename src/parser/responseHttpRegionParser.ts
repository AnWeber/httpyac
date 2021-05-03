import { HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, HttpSymbolKind, ParserContext } from '../models';
import { ParserRegex } from './parserRegex';


export class ResponseHttpRegionParser implements HttpRegionParser {
  supportsEmptyLine = true;

  async parse(lineReader: HttpRegionParserGenerator, context: ParserContext): Promise<HttpRegionParserResult> {

    const next = lineReader.next();
    if (!next.done) {
      const responseSymbol = context.data.httpResponseSymbol;
      if (responseSymbol) {
        responseSymbol.endLine = next.value.line;
        responseSymbol.endOffset = next.value.textLine.length;
        return {
          nextParserLine: next.value.line,
        };
      }
      const match = ParserRegex.responseLine.exec(next.value.textLine);
      if (match) {

        context.data.httpResponseSymbol = {
          name: 'response',
          description: 'response',
          kind: HttpSymbolKind.response,
          startLine: next.value.line,
          startOffset: 0,
          endLine: next.value.line,
          endOffset: next.value.textLine.length,
        };
        return {
          nextParserLine: next.value.line,
          symbols: [context.data.httpResponseSymbol],
        };
      }
    }
    return false;
  }

  close(context: ParserContext): void {
    delete context.data.httpResponseSymbol;
  }
}
