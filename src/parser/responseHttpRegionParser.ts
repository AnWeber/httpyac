import { getHttpLineGenerator, HttpRegionParserResult, HttpSymbolKind, ParserContext } from '../models';
import { toMultiLineString, parseContentType, setAdditionalResponseBody } from '../utils';
import { ParserRegex } from './parserRegex';

export async function parseResponse(
  getLineReader: getHttpLineGenerator,
  context: ParserContext
): Promise<HttpRegionParserResult> {
  const lineReader = getLineReader();

  let next = lineReader.next();
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
      context.httpRegion.response = {
        protocol: `HTTP/${match.groups.httpVersion || '1.1'}`,
        httpVersion: match.groups.httpVersion,
        statusCode: +match.groups.statusCode,
        statusMessage: match.groups.statusMessage,
        headers: {},
      };
      const symbol = {
        name: 'response',
        description: 'response',
        kind: HttpSymbolKind.response,
        startLine: next.value.line,
        startOffset: 0,
        endLine: next.value.line,
        endOffset: next.value.textLine.length,
      };

      next = lineReader.next();
      while (!next.done) {
        symbol.endLine = next.value.line;
        symbol.endOffset = next.value.textLine.length;
        const headerMatch = ParserRegex.request.header.exec(next.value.textLine);
        if (headerMatch?.groups?.key && headerMatch?.groups?.value) {
          context.httpRegion.response.headers = Object.assign(context.httpRegion.response?.headers, {
            [headerMatch.groups.key]: headerMatch.groups.value,
          });
        } else {
          break;
        }
        next = lineReader.next();
      }

      context.data.httpResponseSymbol = {
        symbol,
        body: [],
      };

      return {
        nextParserLine: symbol.endLine,
        symbols: [symbol],
      };
    }
  }
  return false;
}

export async function closeResponseBody(context: ParserContext): Promise<void> {
  if (context.data.httpResponseSymbol) {
    if (context.httpRegion.response && context.data.httpResponseSymbol.body.length > 0) {
      const response = context.httpRegion.response;
      const body = toMultiLineString(context.data.httpResponseSymbol.body);
      response.body = body;
      response.rawBody = Buffer.from(body);
      if (response.headers) {
        response.contentType = parseContentType(response.headers);
      }
      setAdditionalResponseBody(response);
    }

    delete context.data.httpResponseSymbol;
  }
}
