import * as models from '../../models';
import * as utils from '../../utils';
import * as parserUtils from '../../utils/parserUtils';
import { WebsocketRequest } from './websocketRequest';
import { WebsocketRequestClient } from './websocketRequestClient';

const WebsocketLine = /^\s*(ws|wss|websocket)\s*(?<url>.+?)\s*$/iu;
const WebsocketProtocol = /^\s*ws(s)?:\/\/(?<url>.+?)\s*$/iu;

export async function parseWebsocketLine(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  const next = lineReader.next();
  if (!next.done && isValidWebsocket(next.value.textLine, context.httpRegion)) {
    if (context.httpRegion.request) {
      return {
        endRegionLine: next.value.line - 1,
        nextParserLine: next.value.line - 1,
        symbols: [],
      };
    }

    const requestLine = getWebsocketLine(next.value.textLine, next.value.line);
    if (!requestLine) {
      return false;
    }
    context.httpRegion.request = requestLine.request;
    const requestSymbol: models.HttpSymbol = {
      name: next.value.textLine,
      description: 'WebSocket request-line',
      kind: models.HttpSymbolKind.requestLine,
      startLine: next.value.line,
      startOffset: 0,
      endLine: next.value.line,
      endOffset: next.value.textLine.length,
      children: [requestLine.symbol],
    };

    const result: models.HttpRegionParserResult = {
      nextParserLine: next.value.line,
      symbols: [requestSymbol],
    };

    const headers = {};
    requestLine.request.headers = headers;

    const headersResult = await parserUtils.parseSubsequentLines(
      lineReader,
      [
        parserUtils.parseComments,
        parserUtils.parseRequestHeaderFactory(headers),
        utils.parseDefaultHeadersFactory(),
        parserUtils.parseUrlLineFactory(url => (requestLine.request.url += url)),
      ],
      context
    );

    if (headersResult) {
      result.nextParserLine = headersResult.nextLine || result.nextParserLine;
      for (const parseResult of headersResult.parseResults) {
        result.symbols?.push?.(...parseResult.symbols);
      }
    }

    context.httpRegion.hooks.execute.addHook(
      'ws',
      utils.executeRequestClientFactory((request, context) => new WebsocketRequestClient(request, context))
    );

    return result;
  }
  return false;
}

function getWebsocketLine(
  textLine: string,
  line: number
): { request: WebsocketRequest; symbol: models.HttpSymbol } | undefined {
  const lineMatch = WebsocketLine.exec(textLine);
  if (lineMatch && lineMatch.length > 1 && lineMatch.groups) {
    return {
      request: {
        supportsStreaming: true,
        protocol: 'WS',
        url: lineMatch.groups.url,
        method: 'WS',
      },
      symbol: {
        name: lineMatch.groups.url,
        description: 'WebSocket Url',
        kind: models.HttpSymbolKind.url,
        startLine: line,
        startOffset: 0,
        endLine: line,
        endOffset: textLine.length,
        children: utils.parseHandlebarsSymbols(textLine, line),
      },
    };
  }
  const protocolMatch = WebsocketProtocol.exec(textLine);
  if (protocolMatch && protocolMatch.length > 1 && protocolMatch.groups) {
    return {
      request: {
        supportsStreaming: true,
        protocol: 'WS',
        url: protocolMatch.groups.url,
        method: 'WS',
      },
      symbol: {
        name: protocolMatch.groups.url,
        description: 'WebSocket Url',
        kind: models.HttpSymbolKind.url,
        startLine: line,
        startOffset: 0,
        endLine: line,
        endOffset: textLine.length,
        children: utils.parseHandlebarsSymbols(textLine, line),
      },
    };
  }
  return undefined;
}

function isValidWebsocket(textLine: string, httpRegion: models.HttpRegion) {
  if (utils.isStringEmpty(textLine)) {
    return false;
  }

  if (WebsocketLine.exec(textLine)?.groups?.url) {
    return true;
  }
  if (!httpRegion.request) {
    return WebsocketProtocol.exec(textLine)?.groups?.url;
  }
  return false;
}
