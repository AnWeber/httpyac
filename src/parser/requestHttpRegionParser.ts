
import { HttpRegion, HttpRequest } from '../httpRegion';
import { HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult } from './httpRegionParser';

import { isString, isEmptyString, parseMimeType, isRequestMethod, getHeader } from '../utils';
import {httpClientActionProcessor  } from '../actionProcessor/httpClientActionProcessor';
import {variableReplaceActionProcessor  } from '../actionProcessor/variableReplaceActionProcessor';

const REGEX_REQUESTLINE = /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE)\s*(.+?)(?:\s+(HTTP\/\S+))?$/;

export class RequestHttpRegionParser implements HttpRegionParser{




  private getRequestLine(textLine: string): HttpRequest{
    const matches = REGEX_REQUESTLINE.exec(textLine);
    if (matches && matches.length >= 3) {
      return {
        url: matches[2],
        method: isRequestMethod(matches[1]) ? matches[1] : 'GET' ,
        headers: {},
      };
    }
    return {
      url: textLine,
      method: 'GET',
      headers: {}
    };
  }


  private isRequestQueryLine(textLine: string) {
    return /^\s*(\?|&)([^=\s]+)=(.*)$/.test(textLine);
  }

  private getRequestHeader(textLine: string) {
    const matches = /^\s*([\w\-]+)\s*\:\s*(.*?)\s*$/.exec(textLine);

    if (matches) {
      return {
        [matches[1]]: matches.length > 2 ? matches[2] : null,
      };
    }
    return null;
  }

  parse(lineReader: HttpRegionParserGenerator, httpRegion: HttpRegion): Promise<HttpRegionParserResult> {
    let next = lineReader.next();
    if (!next.done && !isEmptyString(next.value.textLine) && !httpRegion.position.requestLine) {
      httpRegion.request = this.getRequestLine(next.value.textLine);
      httpRegion.position.requestLine = next.value.line;

      const result: HttpRegionParserResult = {
        endLine: next.value.line,
      };
      next = lineReader.next();
      while (!next.done) {
        result.endLine = next.value.line;
        if (isEmptyString(next.value.textLine)) {
          break;
        } else if (this.isRequestQueryLine(next.value.textLine)) {
          httpRegion.request.url += next.value.textLine;
        } else {
          const requestHeader = this.getRequestHeader(next.value.textLine);
          if (requestHeader) {
            Object.assign(httpRegion.request.headers, requestHeader);
          }
        }
        next = lineReader.next();
      }
      httpRegion.actions.push({
        type: 'variableReplacer',
        processor: variableReplaceActionProcessor
      }, {
        type: 'request',
        processor: httpClientActionProcessor
      });
      const contentType = getHeader(httpRegion.request.headers, 'content-type');
      if (isString(contentType)) {
        httpRegion.request.contentType = parseMimeType(contentType);
      }
      return Promise.resolve(result);
    }
    return Promise.resolve(false);
  }

}


