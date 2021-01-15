
import { HttpRegion, HttpRequest, HttpFile, HttpSymbol, HttpSymbolKind } from '../httpRegion';
import { HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult } from './httpRegionParser';

import { isString, isStringEmpty, parseMimeType, isRequestMethod, getHeader } from '../utils';
import {httpClientActionProcessor  } from '../actionProcessor';

const REGEX_REQUESTLINE = /^\s*(?<method>GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE)\s*(?<url>.+?)(?:\s+(HTTP\/\S+))?$/;

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

  private getRequestHeader(textLine: string) {
    const headerMatch = /^\s*(?<key>[\w\-]+)\s*\:\s*(?<value>.*?)\s*$/.exec(textLine);
    if (headerMatch && headerMatch.length > 1 && headerMatch.groups) {
      return {
        key: headerMatch.groups.key,
        value: headerMatch.groups.value
      };
    }
    return null;
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

  async parse(lineReader: HttpRegionParserGenerator, httpRegion: HttpRegion, httpFile: HttpFile): Promise<HttpRegionParserResult> {
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
          const requestHeader = this.getRequestHeader(next.value.textLine);
          if (requestHeader) {
            symbols.push({
              name: requestHeader.key,
              description:  requestHeader.value,
              kind: HttpSymbolKind.requestHeader,
              startLine: next.value.line,
              startOffset: next.value.textLine.indexOf(requestHeader.key),
              endLine: next.value.line,
              endOffset: next.value.textLine.length,
              children: [{
                name: requestHeader.key,
                description: 'request header key',
                kind: HttpSymbolKind.requestHeaderValue,
                startLine: next.value.line,
                startOffset: next.value.textLine.indexOf(requestHeader.key),
                endLine: next.value.line,
                endOffset: next.value.textLine.indexOf(requestHeader.key) + requestHeader.key.length,
              }, {
                  name: requestHeader.value,
                  description: 'request header value',
                  kind: HttpSymbolKind.requestHeaderValue,
                  startLine: next.value.line,
                  startOffset: next.value.textLine.indexOf(requestHeader.value),
                  endLine: next.value.line,
                  endOffset: next.value.textLine.indexOf(requestHeader.value) + requestHeader.value.length,
                }
              ]
            });
            Object.assign(httpRegion.request.headers, requestHeader);
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

}


