
import { HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, HttpSymbol, HttpSymbolKind, ParserContext } from '../models';


const BODY_IDENTIFIER = 'response_body';

export class ResponseHttpRegionParser implements HttpRegionParser {
  supportsEmptyLine = true;

  async parse(lineReader: HttpRegionParserGenerator, context: ParserContext): Promise<HttpRegionParserResult> {

    let next = lineReader.next();
    if (!next.done) {
      const responseSymbol: HttpSymbol = context.data[BODY_IDENTIFIER];
      if (responseSymbol) {
        responseSymbol.endLine = next.value.line;
        responseSymbol.endOffset = next.value.textLine.length;
        return {
          endLine: next.value.line,
        };
      }
      const match = /^\s*(HTTP\/\S+)\s*([1-5][0-9][0-9])\s*(.*)$/.exec(next.value.textLine);
      if (match) {

        context.data[BODY_IDENTIFIER] = {
          name: 'response',
          description: 'response',
          kind: HttpSymbolKind.response,
          startLine: next.value.line,
          startOffset: 0,
          endLine: next.value.line,
          endOffset: next.value.textLine.length,
        };
        return {
          endLine: next.value.line,
          symbols: [context.data[BODY_IDENTIFIER]],
        };
      }
    }
    return false;
  }

  close(context: ParserContext): void {
    delete context.data[BODY_IDENTIFIER];
  }
}


