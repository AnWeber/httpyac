
import { HttpRegion, HttpRequest, HttpFile } from '../httpRegion';
import { HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult } from './httpRegionParser';

import { isString, isStringEmpty, parseMimeType, isRequestMethod, getHeader } from '../utils';
import {httpClientActionProcessor  } from '../actionProcessor';

const REGEX_REQUESTLINE = /^(?<method>GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE)?\s*(?<url>.+?)(?:\s+(HTTP\/\S+))?$/;

export class RequestHttpRegionParser implements HttpRegionParser{

  private getRequestLine(textLine: string): HttpRequest{
    const urlMatch = REGEX_REQUESTLINE.exec(textLine);
    if (urlMatch && urlMatch.length > 1 && urlMatch.groups) {
      return {
        url: urlMatch.groups.url,
        method: isRequestMethod(urlMatch.groups.method) ? urlMatch.groups.method : 'GET',
        headers: {}
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
    const headerMatch = /^\s*(?<key>[\w\-]+)\s*\:\s*(?<value>.*?)\s*$/.exec(textLine);
    if (headerMatch && headerMatch.length > 1 && headerMatch.groups) {
      return {
        [headerMatch.groups.key]: headerMatch.groups.value
      };
    }
    return null;
  }

  parse(lineReader: HttpRegionParserGenerator, httpRegion: HttpRegion, httpFile: HttpFile): Promise<HttpRegionParserResult> {
    let next = lineReader.next();
    if (!next.done && !isStringEmpty(next.value.textLine) && !httpRegion.position.requestLine) {
      httpRegion.request = this.getRequestLine(next.value.textLine);
      httpRegion.position.requestLine = next.value.line;

      const result: HttpRegionParserResult = {
        endLine: next.value.line,
      };
      next = lineReader.next();
      while (!next.done) {
        result.endLine = next.value.line;
        if (isStringEmpty(next.value.textLine)) {
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


