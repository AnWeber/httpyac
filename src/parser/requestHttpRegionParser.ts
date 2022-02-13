import * as actions from '../actions';
import * as models from '../models';
import * as utils from '../utils';

const RequestLineRegex =
  /^\s*(?<method>GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE|PROPFIND|PROPPATCH|MKCOL|COPY|MOVE|LOCK|UNLOCK|CHECKOUT|CHECKIN|REPORT|MERGE|MKACTIVITY|MKWORKSPACE|VERSION-CONTROL|BASELINE-CONTROL)\s*(?<url>.+?)(\s+HTTP\/(?<version>(\S+)))?$/u;

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

    const headersResult = utils.parseSubsequentLines(
      lineReader,
      [
        utils.parseComments,
        utils.parseRequestHeaderFactory(headers),
        utils.parseDefaultHeadersFactory((headers, context) => Object.assign(context.request?.headers, headers)),
        utils.parseQueryLineFactory(url => (request.url += url)),
        utils.parseUrlLineFactory(url => (request.url += url)),
      ],
      context
    );

    if (headersResult) {
      result.nextParserLine = headersResult.nextLine || result.nextParserLine;
      for (const parseResult of headersResult.parseResults) {
        symbols.push(...parseResult.symbols);
      }
    }

    context.httpRegion.hooks.execute.addObjHook(obj => obj.process, new actions.HttpClientAction());

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
      }
    );

    return {
      request: {
        url: requestLineMatch.groups.url,
        method: utils.isHttpRequestMethod(requestLineMatch.groups.method) ? requestLineMatch.groups.method : 'GET',
        options: {
          http2: requestLineMatch.groups.version
            ? ['1.1', '1.0'].indexOf(requestLineMatch.groups.version) < 0
            : undefined,
        },
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
