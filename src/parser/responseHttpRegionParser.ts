import * as models from '../models';
import * as utils from '../utils';
import { ParserRegex } from './parserRegex';

export async function parseResponse(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();

  const next = lineReader.next();
  if (!next.done) {
    const responseSymbol = context.data.httpResponseSymbol;
    if (responseSymbol) {
      responseSymbol.body.push(next.value.textLine);

      responseSymbol.symbol.endLine = next.value.line;
      responseSymbol.symbol.endOffset = next.value.textLine.length;
      return {
        nextParserLine: next.value.line,
        symbols: [],
      };
    }
    const match = ParserRegex.responseLine.exec(next.value.textLine);
    if (match && match.groups?.statusCode) {
      const headers: Record<string, unknown> = {};
      context.httpRegion.response = {
        protocol: `HTTP/${match.groups.httpVersion || '1.1'}`,
        httpVersion: match.groups.httpVersion,
        statusCode: +match.groups.statusCode,
        statusMessage: match.groups.statusMessage,
        headers,
      };

      context.data.httpResponseSymbol = {
        symbol: {
          name: 'response',
          description: 'response',
          kind: models.HttpSymbolKind.response,
          startLine: next.value.line,
          startOffset: 0,
          endLine: next.value.line,
          endOffset: next.value.textLine.length,
        },
        body: [],
      };
      const symbols = [context.data.httpResponseSymbol.symbol];

      const result: models.HttpRegionParserResult = {
        nextParserLine: next.value.line,
        symbols,
      };

      const headersResult = utils.parseSubsequentLines(lineReader, [utils.parseRequestHeaderFactory(headers)], context);

      if (headersResult) {
        result.nextParserLine = headersResult.nextLine || result.nextParserLine;
        for (const parseResult of headersResult.parseResults) {
          symbols.push(...parseResult.symbols);
        }
      }
      return result;
    }
  }
  return false;
}

export async function closeResponseBody(context: models.ParserContext): Promise<void> {
  if (context.data.httpResponseSymbol) {
    if (context.httpRegion.response && context.data.httpResponseSymbol.body.length > 0) {
      const response = context.httpRegion.response;
      const body = utils.toMultiLineString(context.data.httpResponseSymbol.body);
      response.body = body;
      response.rawBody = Buffer.from(body);
      if (response.headers) {
        response.contentType = utils.parseContentType(response.headers);
      }
      utils.setAdditionalResponseBody(response);
    }

    delete context.data.httpResponseSymbol;
  }
}
