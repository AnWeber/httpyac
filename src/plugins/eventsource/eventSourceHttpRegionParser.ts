import * as models from '../../models';
import * as utils from '../../utils';
import { EventSourceClientAction } from './eventSourceClientAction';
import { EventSourceRequest } from './eventSourceRequest';

const EventSourceLine = /^\s*(sse|eventsource)\s*(?<url>.+?)\s*$/iu;

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
      description: 'SSE request-line',
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

    const headersResult = utils.parseSubsequentLines(
      lineReader,
      [
        utils.parseComments,
        utils.parseRequestHeaderFactory(headers),
        utils.parseDefaultHeadersFactory((headers, context) => {
          if (context.request) {
            if (context.request.headers) {
              Object.assign(context.request?.headers, headers);
            } else {
              context.request.headers = headers;
            }
          }
        }),
        utils.parseUrlLineFactory(url => (eventSourceLine.request.url += url)),
      ],
      context
    );

    if (headersResult) {
      result.nextParserLine = headersResult.nextLine || result.nextParserLine;
      for (const parseResult of headersResult.parseResults) {
        result.symbols?.push?.(...parseResult.symbols);
      }
    }

    context.httpRegion.hooks.execute.addObjHook(obj => obj.process, new EventSourceClientAction());

    return result;
  }
  return false;
}

function getEventSourceLine(
  textLine: string,
  line: number
): { request: EventSourceRequest; symbol: models.HttpSymbol } | undefined {
  const lineMatch = EventSourceLine.exec(textLine);
  if (lineMatch && lineMatch.length > 1 && lineMatch.groups?.url) {
    return {
      request: {
        supportsStreaming: true,
        protocol: 'SSE',
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
        children: utils.parseHandlebarsSymbols(textLine, line),
      },
    };
  }
  return undefined;
}

function isValidEventSource(textLine: string) {
  if (utils.isStringEmpty(textLine)) {
    return false;
  }

  if (EventSourceLine.exec(textLine)?.groups?.url) {
    return true;
  }
  return false;
}
