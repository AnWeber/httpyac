import { HttpRegion, HttpRequest, HttpSymbol, HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext, HttpRegionAction } from '../models';

import { isString, isStringEmpty, parseMimeType, isRequestMethod, getHeader } from '../utils';
import * as actions from '../actions';
import { ParserRegex } from './parserRegex';

type RequestLineParserMethod = (text: string, line: number, request: HttpRequest) => false | { symbols: HttpSymbol[], actions?: HttpRegionAction[] };

export class RequestHttpRegionParser implements HttpRegionParser {

  private getRequestLine(textLine: string, line: number): { request: HttpRequest, requestSymbols: Array<HttpSymbol> } {
    const requestSymbols: Array<HttpSymbol> = [];
    const urlMatch = ParserRegex.request.requestLine.exec(textLine);
    if (urlMatch && urlMatch.length > 1 && urlMatch.groups) {
      requestSymbols.push({
        name: urlMatch.groups.method,
        description: 'request method',
        kind: HttpSymbolKind.requestHeader,
        startLine: line,
        startOffset: textLine.indexOf(urlMatch.groups.method),
        endLine: line,
        endOffset: textLine.indexOf(urlMatch.groups.method) + urlMatch.groups.method.length,
      }, {
        name: urlMatch.groups.url,
        description: 'request url',
        kind: HttpSymbolKind.requestUrl,
        startLine: line,
        startOffset: textLine.indexOf(urlMatch.groups.url),
        endLine: line,
        endOffset: textLine.length,
      });

      return {
        request: {
          url: urlMatch.groups.url,
          method: isRequestMethod(urlMatch.groups.method) ? urlMatch.groups.method : 'GET',
          http2: urlMatch.groups.version ? ['1.1', '1.0'].indexOf(urlMatch.groups.version) < 0 : undefined,
          headers: {},
        },
        requestSymbols
      };
    }
    requestSymbols.push({
      name: textLine.trim(),
      description: 'request url',
      kind: HttpSymbolKind.requestUrl,
      startLine: line,
      startOffset: 0,
      endLine: line,
      endOffset: textLine.length,
    });
    return {
      request: {
        url: textLine.trim(),
        method: 'GET',
        headers: {},
      },
      requestSymbols
    };
  }


  private isValidRequestLine(textLine: string, httpRegion: HttpRegion) {
    if (isStringEmpty(textLine)) {
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

  async parse(lineReader: HttpRegionParserGenerator, { httpRegion }: ParserContext): Promise<HttpRegionParserResult> {
    let next = lineReader.next();
    if (!next.done && this.isValidRequestLine(next.value.textLine, httpRegion)) {
      if (httpRegion.request) {
        return {
          endRegionLine: next.value.line - 1,
          nextParserLine: next.value.line - 1,
          symbols: [],
        };
      }

      const requestSymbol: HttpSymbol = {
        name: next.value.textLine,
        description: 'http request-line',
        kind: HttpSymbolKind.requestLine,
        startLine: next.value.line,
        startOffset: 0,
        endLine: next.value.line,
        endOffset: next.value.textLine.length,
      };
      const symbols = [requestSymbol];

      const { request, requestSymbols } = this.getRequestLine(next.value.textLine, next.value.line);
      httpRegion.request = request;
      requestSymbol.children = requestSymbols;

      const result: HttpRegionParserResult = {
        nextParserLine: next.value.line,
        symbols
      };
      next = lineReader.next();
      while (!next.done) {

        const requestLineParser: Array<RequestLineParserMethod> = [
          this.parseRequestHeader,
          this.parseDefaultHeaders,
          this.parseQueryLine,
          this.parseUrlLine
        ];
        let hasResult = false;
        for (const lineParser of requestLineParser) {
          const parseResult = lineParser(next.value.textLine, next.value.line, request);
          if (parseResult) {
            hasResult = true;
            symbols.push(...parseResult.symbols);
            if (parseResult.actions) {
              httpRegion.actions.push(...parseResult.actions);
            }
            break;
          }
        }
        if (!hasResult) {
          break;
        }
        result.nextParserLine = next.value.line;
        next = lineReader.next();
      }

      httpRegion.actions.splice(0, 0, new actions.CreateRequestAction());
      httpRegion.actions.push(
        new actions.EnvDefaultHeadersAction(),
        new actions.RequestBodyImportAction(),
        new actions.VariableReplacerAction(),
        new actions.CookieJarAction(),
        new actions.HttpClientAction(),
        new actions.ResponseAsVariableAction()
      );
      if (httpRegion.request.headers) {
        const contentType = getHeader(httpRegion.request.headers, 'content-type');
        if (isString(contentType)) {
          httpRegion.request.contentType = parseMimeType(contentType);
        }
      }
      return result;
    }
    return false;
  }


  private parseDefaultHeaders(textLine: string, line: number) {
    const fileHeaders = ParserRegex.request.headersSpread.exec(textLine);
    if (fileHeaders?.groups?.variableName) {
      const val = textLine.trim();
      return {
        symbols: [{
          name: val,
          description: 'header variable',
          kind: HttpSymbolKind.requestHeader,
          startLine: line,
          startOffset: textLine.indexOf(val),
          endOffset: textLine.length,
          endLine: line,
        }],
        actions: [new actions.DefaultHeadersAction(fileHeaders.groups.variableName)]
      };
    }
    return false;
  }

  private parseUrlLine(textLine: string, line: number, httpRequest: HttpRequest) {
    if (ParserRegex.request.urlLine.test(textLine)) {
      const val = textLine.trim();
      httpRequest.url += val;
      return {
        symbols: [{
          name: val,
          description: 'urlpart',
          kind: HttpSymbolKind.requestUrl,
          startLine: line,
          startOffset: textLine.indexOf(val),
          endOffset: textLine.length,
          endLine: line,
        }]
      };
    }
    return false;
  }


  private parseQueryLine(textLine: string, line: number, httpRequest: HttpRequest) {
    if (ParserRegex.request.queryLine.test(textLine)) {
      const val = textLine.trim();
      httpRequest.url += val;
      return {
        symbols: [{
          name: val,
          description: 'query',
          kind: HttpSymbolKind.requestUrl,
          startLine: line,
          startOffset: textLine.indexOf(val),
          endOffset: textLine.length,
          endLine: line,
        }]
      };
    }
    return false;
  }


  private parseRequestHeader(textLine: string, line: number, httpRequest: HttpRequest) {
    if (!httpRequest.headers) {
      httpRequest.headers = {};
    }
    const headerMatch = ParserRegex.request.header.exec(textLine);
    if (headerMatch?.groups?.key && headerMatch?.groups?.value) {
      httpRequest.headers[headerMatch.groups.key] = headerMatch.groups.value;

      return {
        symbols: [{
          name: headerMatch.groups.key,
          description: headerMatch.groups.value,
          kind: HttpSymbolKind.requestHeader,
          startLine: line,
          startOffset: textLine.indexOf(headerMatch.groups.key),
          endLine: line,
          endOffset: textLine.length,
          children: [{
            name: headerMatch.groups.key,
            description: 'request header key',
            kind: HttpSymbolKind.requestHeaderValue,
            startLine: line,
            startOffset: textLine.indexOf(headerMatch.groups.key),
            endLine: line,
            endOffset: textLine.indexOf(headerMatch.groups.key) + headerMatch.groups.key.length,
          }, {
            name: headerMatch.groups.value,
            description: 'request header value',
            kind: HttpSymbolKind.requestHeaderValue,
            startLine: line,
            startOffset: textLine.indexOf(headerMatch.groups.value),
            endLine: line,
            endOffset: textLine.indexOf(headerMatch.groups.value) + headerMatch.groups.value.length,
          }
          ]
        }]
      };
    }
    return false;
  }
}
