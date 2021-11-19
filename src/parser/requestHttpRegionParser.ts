import * as actions from '../actions';
import * as models from '../models';
import * as utils from '../utils';
import { ParserRegex } from './parserRegex';
import * as parserUtils from './parserUtils';

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

    const headersResult = parserUtils.parseSubsequentLines(
      lineReader,
      [
        parserUtils.parseComments,
        parserUtils.parseRequestHeaderFactory(headers),
        parserUtils.parseDefaultHeadersFactory((headers, context) => Object.assign(context.request?.headers, headers)),
        parserUtils.parseQueryLineFactory(url => (request.url += url)),
        parserUtils.parseUrlLineFactory(url => (request.url += url)),
      ],
      context
    );

    if (headersResult) {
      result.nextParserLine = headersResult.nextLine || result.nextParserLine;
      for (const parseResult of headersResult.parseResults) {
        symbols.push(...parseResult.symbols);
      }
    }

    context.httpRegion.hooks.execute.addObjHook(
      obj => obj.process,
      new actions.CookieJarAction(),
      new actions.HttpClientAction()
    );

    context.httpRegion.hooks.execute.addInterceptor(new actions.CreateRequestInterceptor());

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
  const requestLineMatch = ParserRegex.request.requestLine.exec(textLine);
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
        http2: requestLineMatch.groups.version
          ? ['1.1', '1.0'].indexOf(requestLineMatch.groups.version) < 0
          : undefined,
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
    },
    requestSymbols,
  };
}

function isValidRequestLine(textLine: string, httpRegion: models.HttpRegion) {
  if (utils.isStringEmpty(textLine)) {
    return false;
  }
  if (httpRegion.request) {
    if (ParserRegex.request.requestLine.exec(textLine)?.groups?.method) {
      return true;
    }
    return false;
  }
  return true;
}
