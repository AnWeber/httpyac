
import { HttpRegion, HttpRequest, HttpSymbol, HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext  } from '../models';

import { isString, isStringEmpty, parseMimeType, isRequestMethod, getHeader } from '../utils';
import {httpClientActionProcessor, defaultHeadersActionProcessor } from '../actionProcessor';

const REGEX_REQUESTLINE = /^\s*(?<method>GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE|PROPFIND|PROPPATCH|MKCOL|COPY|MOVE|LOCK|UNLOCK|CHECKOUT|CHECKIN|REPORT|MERGE|MKACTIVITY|MKWORKSPACE|VERSION-CONTROL|BASELINE-CONTROL)\s*(?<url>.+?)(?:\s+(HTTP\/\S+))?$/;
export class RequestHttpRegionParser implements HttpRegionParser {

  private getRequestLine(textLine: string, line: number): { request: HttpRequest, requestSymbols: Array<HttpSymbol> } {
    const requestSymbols: Array<HttpSymbol> = [];
    const urlMatch = REGEX_REQUESTLINE.exec(textLine);
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
          headers: {}
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


  private isRequestQueryLine(textLine: string) {
    return /^\s*(\?|&)([^=\s]+)=(.*)$/.test(textLine);
  }


  private isValidRequestLine(textLine: string, httpRegion: HttpRegion) {
    if (isStringEmpty(textLine)) {
      return false;
    }
    if (!!httpRegion.request) {
      if (!!REGEX_REQUESTLINE.exec(textLine)?.groups?.method) {
        return true;
      }
      return false;
    }
    return true;
  }

  async parse(lineReader: HttpRegionParserGenerator, { httpRegion }: ParserContext): Promise<HttpRegionParserResult> {
    let next = lineReader.next();
    if (!next.done && this.isValidRequestLine(next.value.textLine, httpRegion)) {
      if (!!httpRegion.request){
        return {
          newRegion: true,
          endLine: next.value.line - 1,
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

      const { request, requestSymbols} = this.getRequestLine(next.value.textLine, next.value.line);
      httpRegion.request = request;
      requestSymbol.children = requestSymbols;

      const result: HttpRegionParserResult = {
        endLine: next.value.line,
        symbols
      };
      next = lineReader.next();
      while (!next.done) {
        result.endLine = next.value.line;
        if (isStringEmpty(next.value.textLine)) {
          break;
        } else if (this.isRequestQueryLine(next.value.textLine)) {
          requestSymbol.endLine = next.value.line;
          requestSymbol.endOffset = next.value.textLine.length;
          httpRegion.request.url += next.value.textLine.trim();
        } else {
          const fileHeaders = /^\s*...(?<variableName>[^\s]+)\s*$/.exec(next.value.textLine);
          if (fileHeaders && fileHeaders.groups?.variableName) {
            httpRegion.actions.push({
              type: "defaultHeaders",
              data: fileHeaders.groups.variableName,
              processor: defaultHeadersActionProcessor,
            });
          } else {
            symbols.push(...this.parseRequestHeader(next, httpRegion.request));
          }
        }
        next = lineReader.next();
      }

      httpRegion.actions.push({
        type: 'request',
        processor: httpClientActionProcessor
      });
      const contentType = getHeader(httpRegion.request.headers, 'content-type');
      if (isString(contentType)) {
        httpRegion.request.contentType = parseMimeType(contentType);
      }
      return result;
    }
    return false;
  }


  private parseRequestHeader(next: IteratorYieldResult<{ textLine: string; line: number; }>, httpRequest: HttpRequest) {
    const symbols: Array<HttpSymbol> = [];
    const headerMatch = /^\s*(?<key>[\w\-]+)\s*\:\s*(?<value>.*?)\s*$/.exec(next.value.textLine);
    if (headerMatch?.groups?.key && headerMatch?.groups?.value) {
      symbols.push({
        name: headerMatch.groups.key,
        description: headerMatch.groups.value,
        kind: HttpSymbolKind.requestHeader,
        startLine: next.value.line,
        startOffset: next.value.textLine.indexOf(headerMatch.groups.key),
        endLine: next.value.line,
        endOffset: next.value.textLine.length,
        children: [{
          name: headerMatch.groups.key,
          description: 'request header key',
          kind: HttpSymbolKind.requestHeaderValue,
          startLine: next.value.line,
          startOffset: next.value.textLine.indexOf(headerMatch.groups.key),
          endLine: next.value.line,
          endOffset: next.value.textLine.indexOf(headerMatch.groups.key) + headerMatch.groups.key.length,
        }, {
          name: headerMatch.groups.value,
          description: 'request header value',
          kind: HttpSymbolKind.requestHeaderValue,
          startLine: next.value.line,
          startOffset: next.value.textLine.indexOf(headerMatch.groups.value),
          endLine: next.value.line,
          endOffset: next.value.textLine.indexOf(headerMatch.groups.value) + headerMatch.groups.value.length,
        }
        ]
      });
      httpRequest.headers[headerMatch.groups.key] = headerMatch.groups.value;
    }
    return symbols;
  }
}


