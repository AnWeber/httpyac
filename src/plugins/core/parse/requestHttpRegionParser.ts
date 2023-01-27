import { httpClientProvider } from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';

const RequestLineRegex =
  /^\s*(?<method>GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE|PROPFIND|PROPPATCH|MKCOL|COPY|MOVE|LOCK|UNLOCK|CHECKOUT|CHECKIN|REPORT|MERGE|MKACTIVITY|MKWORKSPACE|VERSION-CONTROL|BASELINE-CONTROL|MKCALENDAR|ACL|SEARCH|GRAPHQL)\s*(?<url>.+?)$/u;

const ProtocolRegex = /(?<url>.*)\s+HTTP\/(?<version>(\S+))/u;
export async function parseRequestLine(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  const next = lineReader.next();
  if (!next.done && isValidRequestLine(next.value.textLine, context.httpRegion)) {
    if (context.httpRegion.request) {
      return {
        endRegionLine: next.value.line - 1,
        nextParserLine: next.value.line - 1,
        symbols: [],
      };
    }

    const requestSymbol: models.HttpSymbol = {
      name: next.value.textLine,
      description: 'http request-line',
      kind: models.HttpSymbolKind.requestLine,
      startLine: next.value.line,
      startOffset: 0,
      endLine: next.value.line,
      endOffset: next.value.textLine.length,
    };
    const symbols = [requestSymbol];

    const { request, requestSymbols } = getRequestLine(next.value.textLine, next.value.line);
    context.httpRegion.request = request;
    requestSymbol.children = requestSymbols;

    const result: models.HttpRegionParserResult = {
      nextParserLine: next.value.line,
      symbols,
    };

    const headers = {};
    request.headers = headers;

    const headersResult = await utils.parseSubsequentLines(
      lineReader,
      [
        utils.parseComments,
        utils.parseRequestHeaderFactory(headers),
        utils.parseDefaultHeadersFactory(),
        utils.parseQueryLineFactory(url => (request.url += url)),
        utils.parseUrlLineFactory(url => (request.url += url)),
      ],
      context
    );

    parseProtocol(request);

    if (headersResult) {
      result.nextParserLine = headersResult.nextLine || result.nextParserLine;
      for (const parseResult of headersResult.parseResults) {
        symbols.push(...parseResult.symbols);
      }
    }

    if (httpClientProvider.cretateRequestClient) {
      context.httpRegion.hooks.execute.addHook(
        'http',
        utils.executeRequestClientFactory(httpClientProvider.cretateRequestClient)
      );
    }

    if (context.httpRegion.request.headers) {
      const contentType = utils.getHeader(context.httpRegion.request.headers, 'content-type');
      if (utils.isString(contentType)) {
        context.httpRegion.request.contentType = utils.parseMimeType(contentType);
      }
    }
    return result;
  }
  return false;
}

function getRequestLine(
  textLine: string,
  line: number
): { request: models.HttpRequest; requestSymbols: Array<models.HttpSymbol> } {
  const requestSymbols: Array<models.HttpSymbol> = [];
  const requestLineMatch = RequestLineRegex.exec(textLine);
  if (requestLineMatch && requestLineMatch.length > 1 && requestLineMatch.groups) {
    requestSymbols.push(
      {
        name: requestLineMatch.groups.method,
        description: 'request method',
        kind: models.HttpSymbolKind.requestHeader,
        startLine: line,
        startOffset: textLine.indexOf(requestLineMatch.groups.method),
        endLine: line,
        endOffset: textLine.indexOf(requestLineMatch.groups.method) + requestLineMatch.groups.method.length,
      },
      {
        name: requestLineMatch.groups.url,
        description: 'request url',
        kind: models.HttpSymbolKind.url,
        startLine: line,
        startOffset: textLine.indexOf(requestLineMatch.groups.url),
        endLine: line,
        endOffset: textLine.length,
        children: utils.parseHandlebarsSymbols(
          requestLineMatch.groups.url,
          line,
          textLine.indexOf(requestLineMatch.groups.url)
        ),
      }
    );

    return {
      request: {
        protocol: 'HTTP',
        url: requestLineMatch.groups.url,
        method: utils.isHttpRequestMethod(requestLineMatch.groups.method) ? requestLineMatch.groups.method : 'GET',
        options: {},
      },
      requestSymbols,
    };
  }
  requestSymbols.push({
    name: textLine.trim(),
    description: 'request url',
    kind: models.HttpSymbolKind.url,
    startLine: line,
    startOffset: 0,
    endLine: line,
    endOffset: textLine.length,
  });
  return {
    request: {
      protocol: 'HTTP',
      url: textLine.trim(),
      method: 'GET',
      options: {},
    },
    requestSymbols,
  };
}

function isValidRequestLine(textLine: string, httpRegion: models.HttpRegion) {
  if (utils.isStringEmpty(textLine)) {
    return false;
  }
  if (httpRegion.request) {
    if (RequestLineRegex.exec(textLine)?.groups?.method) {
      return true;
    }
    return false;
  }
  return true;
}

function parseProtocol(request: models.HttpRequest) {
  if (request.url) {
    const match = ProtocolRegex.exec(request.url);
    if (match?.groups?.version && match.groups.url) {
      request.url = match.groups.url.trim();
      if (['1.1', '1.0'].indexOf(match.groups.version) < 0) {
        if (!request.options) {
          request.options = {};
        }
        request.options.http2 = true;
      }
    }
  }
}
