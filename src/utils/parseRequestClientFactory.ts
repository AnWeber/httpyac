import * as models from '../models';
import { parseMimeType } from './mimeTypeUtils';
import * as parser from './parserUtils';
import { executeRequestClientFactory } from './requestClientUtils';
import { getHeader } from './requestUtils';
import { isString, isStringEmpty } from './stringUtils';

interface RequestParserContext {
  protocol: string;
  method?: string;
  requestClientFactory: (request: models.Request, context: models.ProcessorContext) => models.RequestClient;
  modifyRequest?: (request: models.Request) => void;
  methodRegex: RegExp;
  protocolRegex?: RegExp;
  sessionStore: models.SessionStore;
}

export function parseRequestLineFactory(requestContext: RequestParserContext) {
  return async function parseRequestLine(
    getLineReader: models.getHttpLineGenerator,
    context: models.ParserContext
  ): Promise<models.HttpRegionParserResult> {
    const lineReader = getLineReader();
    const next = lineReader.next();
    if (!next.done && isValidRequestLine(next.value, context, requestContext)) {
      if (context.httpRegion.request) {
        return {
          endRegionLine: next.value.line - 1,
          nextParserLine: next.value.line - 1,
          symbols: [],
        };
      }

      const requestLine = getRequestParseLine(next.value, requestContext);
      if (!requestLine) {
        return false;
      }
      context.httpRegion.request = requestLine.request;
      const requestSymbol = new models.HttpSymbol({
        name: next.value.textLine || 'request line',
        description: `${requestContext.protocol} request-line`,
        kind: models.HttpSymbolKind.requestLine,
        startLine: next.value.line,
        startOffset: 0,
        endLine: next.value.line,
        endOffset: next.value.textLine.length,
        children: [requestLine.symbol],
      });

      const result: models.HttpRegionParserResult = {
        nextParserLine: next.value.line,
        symbols: [requestSymbol],
      };

      const headers = {};
      requestLine.request.headers = headers;

      const headersResult = await parser.parseSubsequentLines(
        lineReader,
        [
          parser.parseComments,
          parser.parseRequestHeaderFactory(headers),
          parser.parseDefaultHeadersFactory(),
          parser.parseQueryLineFactory(url => (requestLine.request.url += url)),
          parser.parseUrlLineFactory(url => (requestLine.request.url += url)),
        ],
        context
      );

      result.nextParserLine = headersResult.nextLine || result.nextParserLine;
      for (const parseResult of headersResult.parseResults) {
        result.symbols?.push?.(...parseResult.symbols);
      }
      requestContext.modifyRequest?.(requestLine.request);
      if (requestLine.request.headers) {
        const contentType = getHeader(requestLine.request.headers, 'content-type');
        if (isString(contentType)) {
          requestLine.request.contentType = parseMimeType(contentType);
        }
      }

      context.httpRegion.hooks.execute.addHook(
        requestContext.protocol.toLowerCase(),
        executeRequestClientFactory(requestContext.requestClientFactory, requestContext.sessionStore)
      );

      return result;
    }
    return false;
  };
}
function getRequestParseLine(
  httpLine: models.HttpLine,
  context: RequestParserContext
): { request: models.Request; symbol: models.HttpSymbol } | undefined {
  const lineMatch = context.methodRegex.exec(httpLine.textLine);
  if (lineMatch && lineMatch.length > 1 && lineMatch.groups) {
    return {
      request: {
        url: lineMatch.groups.url,
        protocol: context.protocol.toUpperCase(),
        method: lineMatch.groups?.method || context.method || context.protocol,
      },
      symbol: new models.HttpSymbol({
        name: lineMatch.groups.url || 'request',
        description: `${context.protocol} Url`,
        kind: models.HttpSymbolKind.url,
        startLine: httpLine.line,
        startOffset: 0,
        endLine: httpLine.line,
        endOffset: httpLine.textLine.length,
        children: parser.parseHandlebarsSymbols(httpLine.textLine, httpLine.line),
      }),
    };
  }
  const protocolMatch = context.protocolRegex?.exec(httpLine.textLine);
  if (protocolMatch && protocolMatch.length > 1 && protocolMatch.groups?.url) {
    return {
      request: {
        url: protocolMatch.groups.url,
        protocol: context.protocol.toUpperCase(),
        method: protocolMatch.groups?.method || context.method || context.protocol,
      },
      symbol: new models.HttpSymbol({
        name: protocolMatch.groups.url || 'request',
        description: `${context.protocol} Url`,
        kind: models.HttpSymbolKind.url,
        startLine: httpLine.line,
        startOffset: 0,
        endLine: httpLine.line,
        endOffset: httpLine.textLine.length,
        children: parser.parseHandlebarsSymbols(httpLine.textLine, httpLine.line),
      }),
    };
  }
  return undefined;
}

function isValidRequestLine(
  httpLine: models.HttpLine,
  context: models.ParserContext,
  requestContext: RequestParserContext
): boolean {
  if (isStringEmpty(httpLine.textLine)) {
    return false;
  }
  if (context.forceRegionDelimiter && !!context.httpRegion.request) {
    return false;
  }
  if (requestContext.methodRegex.exec(httpLine.textLine)?.groups?.url) {
    return true;
  }
  if (!context.httpRegion.request && requestContext.protocolRegex) {
    return !!requestContext.protocolRegex.exec(httpLine.textLine)?.groups?.url;
  }
  return false;
}
