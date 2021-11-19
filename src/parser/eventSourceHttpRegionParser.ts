import * as actions from '../actions';
import * as models from '../models';
import * as utils from '../utils';
import { ParserRegex } from './parserRegex';
import * as parserUtils from './parserUtils';

export async function parseEventSource(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  const next = lineReader.next();
  if (!next.done && isValidEventSource(next.value.textLine)) {
    if (context.httpRegion.request) {
      return {
        endRegionLine: next.value.line - 1,
        nextParserLine: next.value.line - 1,
        symbols: [],
      };
    }

    const eventSourceLine = getEventSourceLine(next.value.textLine, next.value.line);
    if (!eventSourceLine) {
      return false;
    }
    context.httpRegion.request = eventSourceLine.request;
    const requestSymbol: models.HttpSymbol = {
      name: next.value.textLine,
      description: 'websocket request-line',
      kind: models.HttpSymbolKind.requestLine,
      startLine: next.value.line,
      startOffset: 0,
      endLine: next.value.line,
      endOffset: next.value.textLine.length,
      children: [eventSourceLine.symbol],
    };

    const result: models.HttpRegionParserResult = {
      nextParserLine: next.value.line,
      symbols: [requestSymbol],
    };

    const headers = {};
    eventSourceLine.request.headers = headers;

    const headersResult = parserUtils.parseSubsequentLines(
      lineReader,
      [
        parserUtils.parseComments,
        parserUtils.parseRequestHeaderFactory(headers),
        parserUtils.parseDefaultHeadersFactory((headers, context) => Object.assign(context.request?.headers, headers)),
        parserUtils.parseUrlLineFactory(url => (eventSourceLine.request.url += url)),
      ],
      context
    );

    if (headersResult) {
      result.nextParserLine = headersResult.nextLine || result.nextParserLine;
      for (const parseResult of headersResult.parseResults) {
        result.symbols?.push?.(...parseResult.symbols);
      }
    }

    context.httpRegion.hooks.execute.addObjHook(obj => obj.process, new actions.EventSourceClientAction());

    context.httpRegion.hooks.execute.addInterceptor(new actions.CreateRequestInterceptor());

    return result;
  }
  return false;
}

function getEventSourceLine(
  textLine: string,
  line: number
): { request: models.EventSourceRequest; symbol: models.HttpSymbol } | undefined {
  const lineMatch = ParserRegex.stream.eventSourceLine.exec(textLine);
  if (lineMatch && lineMatch.length > 1 && lineMatch.groups) {
    return {
      request: {
        url: lineMatch.groups.url,
        method: 'SSE',
      },
      symbol: {
        name: lineMatch.groups.url,
        description: 'EventSource url',
        kind: models.HttpSymbolKind.url,
        startLine: line,
        startOffset: 0,
        endLine: line,
        endOffset: textLine.length,
      },
    };
  }
  return undefined;
}

function isValidEventSource(textLine: string) {
  if (utils.isStringEmpty(textLine)) {
    return false;
  }

  if (ParserRegex.stream.eventSourceLine.exec(textLine)?.groups?.url) {
    return true;
  }
  return false;
}
