import * as models from '../models';
import * as utils from '../utils';
import * as actions from '../actions';
import { ParserRegex } from './parserRegex';
import * as parserUtils from './parserUtils';

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


    const websocketLine = getWebsocketLine(next.value.textLine, next.value.line);
    if (!websocketLine) {
      return false;
    }
    context.httpRegion.request = websocketLine.request;
    const requestSymbol: models.HttpSymbol = {
      name: next.value.textLine,
      description: 'websocket request-line',
      kind: models.HttpSymbolKind.requestLine,
      startLine: next.value.line,
      startOffset: 0,
      endLine: next.value.line,
      endOffset: next.value.textLine.length,
      children: [websocketLine.symbol],
    };

    const result: models.HttpRegionParserResult = {
      nextParserLine: next.value.line,
      symbols: [requestSymbol],
    };


    const headers = {};
    websocketLine.request.headers = headers;

    const headersResult = parserUtils.parseSubsequentLines(lineReader, [
      parserUtils.parseComments,
      parserUtils.parseRequestHeaderFactory(headers),
      parserUtils.parseDefaultHeadersFactory((headers, context) => Object.assign(context.request?.headers, headers)),
      parserUtils.parseUrlLineFactory(url => (websocketLine.request.url += url)),
    ], context);

    if (headersResult) {
      result.nextParserLine = headersResult.nextLine || result.nextParserLine;
      for (const parseResult of headersResult.parseResults) {
        result.symbols?.push?.(...parseResult.symbols);
      }
    }

    context.httpRegion.hooks.execute.addObjHook(obj => obj.process,
      new actions.EnvDefaultHeadersAction(),
      new actions.VariableReplacerAction(),
      new actions.WebSocketClientAction(),
      new actions.ResponseAsVariableAction());

    context.httpRegion.hooks.execute.addInterceptor(new actions.CreateRequestInterceptor());

    return result;
  }
  return false;
}


function getWebsocketLine(textLine: string, line: number): { request: models.WebsocketRequest, symbol: models.HttpSymbol } | undefined {
  const lineMatch = ParserRegex.websocket.websocketLine.exec(textLine);
  if (lineMatch && lineMatch.length > 1 && lineMatch.groups) {
    return {
      request: {
        url: lineMatch.groups.url,
        method: 'WSS'
      },
      symbol: {
        name: lineMatch.groups.url,
        description: 'websocket url',
        kind: models.HttpSymbolKind.url,
        startLine: line,
        startOffset: 0,
        endLine: line,
        endOffset: textLine.length,
      }
    };
  }
  const protocolMatch = ParserRegex.websocket.websocketProtocol.exec(textLine);
  if (protocolMatch && protocolMatch.length > 1 && protocolMatch.groups) {
    return {
      request: {
        url: protocolMatch.groups.url,
        method: 'WSS'
      },
      symbol: {
        name: protocolMatch.groups.url,
        description: 'WebSocket Url',
        kind: models.HttpSymbolKind.url,
        startLine: line,
        startOffset: 0,
        endLine: line,
        endOffset: textLine.length,
      }
    };
  }
  return undefined;
}


function isValidWebsocket(textLine: string, httpRegion: models.HttpRegion) {
  if (utils.isStringEmpty(textLine)) {
    return false;
  }

  if (ParserRegex.websocket.websocketLine.exec(textLine)?.groups?.url) {
    return true;
  }
  if (!httpRegion.request) {
    return ParserRegex.websocket.websocketProtocol.exec(textLine)?.groups?.url;
  }
  return false;
}
