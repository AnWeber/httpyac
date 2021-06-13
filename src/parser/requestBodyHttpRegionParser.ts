import { HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, HttpSymbol, HttpSymbolKind, ParserContext } from '../models';
import { isString, isStringEmpty } from '../utils';

import { ParserRegex } from './parserRegex';


export class RequestBodyHttpRegionParser implements HttpRegionParser {
  supportsEmptyLine = true;

  async parse(lineReader: HttpRegionParserGenerator, context: ParserContext): Promise<HttpRegionParserResult> {
    if (context.httpRegion.request) {
      const requestBody = this.getRequestBody(context);
      const next = lineReader.next();
      if (!next.done) {


        if (requestBody.rawBody.length > 0 || !isStringEmpty(next.value.textLine)) {

          requestBody.rawBody.push(this.parseLine(next.value.textLine));
          const symbols: Array<HttpSymbol> = [];


          if (!requestBody.symbol || requestBody.symbol.endLine !== next.value.line - 1) {
            requestBody.symbol = {
              name: 'request body',
              description: 'request body',
              kind: HttpSymbolKind.requestBody,
              startLine: next.value.line,
              startOffset: 0,
              endLine: next.value.line,
              endOffset: next.value.textLine.length,
            };
            symbols.push(requestBody.symbol);
          } else {
            requestBody.symbol.endLine = next.value.line;
            requestBody.symbol.endOffset = next.value.textLine.length;
          }

          return {
            nextParserLine: next.value.line,
            symbols,
          };
        }
      }
    }
    return false;
  }

  private getRequestBody(context: ParserContext) {
    let result = context.data.request_body;
    if (!result) {
      result = {
        rawBody: [],
      };
      context.data.request_body = result;
    }
    return result;
  }
  private getAndRemoveRequestBody(context: ParserContext) {
    const result = context.data.request_body;
    if (result) {
      delete context.data.request_body;
    }
    return result;
  }

  private parseLine(textLine: string) {
    const fileImport = ParserRegex.request.fileImport.exec(textLine);
    if (fileImport && fileImport.length === 4 && fileImport.groups) {
      return {
        fileName: fileImport.groups.fileName,
        injectVariables: !!fileImport.groups.injectVariables,
        encoding: this.getBufferEncoding(fileImport.groups.encoding),
      };
    }
    return textLine;
  }

  private isBufferEncoding(encoding: string): encoding is BufferEncoding {
    return ['ascii', 'utf8', 'utf-8',
      'utf16le', 'ucs2', 'ucs-2',
      'base64', 'latin1', 'binary', 'hex']
      .indexOf(encoding) >= 0;
  }

  private getBufferEncoding(encoding: string) : BufferEncoding {
    if (encoding && this.isBufferEncoding(encoding)) {
      return encoding;
    }
    return 'utf8';
  }

  close(context: ParserContext): void {
    const requestBody = this.getAndRemoveRequestBody(context);
    if (context.httpRegion.request && !!requestBody) {

      this.removeTrailingEmptyLines(requestBody.rawBody);
      context.httpRegion.request.rawBody = requestBody.rawBody;

    }
  }

  removeTrailingEmptyLines(obj: Array<unknown>) : void {
    while (obj.length > 0 && isStringEmpty(obj[obj.length - 1])) {
      obj.pop();
    }
    if (obj.length > 0) {
      const lastLine = obj[obj.length - 1];
      if (isString(lastLine)) {
        if (/\s*<--->\s*/u.test(lastLine)) {
          obj.pop();
        }
      }
    }
  }
}
