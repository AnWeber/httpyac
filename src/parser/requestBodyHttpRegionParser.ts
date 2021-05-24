import { HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, HttpRequestBodyLine, HttpSymbol, HttpSymbolKind, ParserContext } from '../models';
import { EOL } from 'os';
import { toAbsoluteFilename, isString, isMimeTypeMultiPartFormData, isStringEmpty, isMimeTypeNewlineDelimitedJSON, isMimeTypeFormUrlEncoded } from '../utils';

import { log, popupService } from '../logger';
import { ParserRegex } from './parserRegex';
import { fileProvider, PathLike } from '../fileProvider';


export class RequestBodyHttpRegionParser implements HttpRegionParser {
  supportsEmptyLine = true;

  async parse(lineReader: HttpRegionParserGenerator, context: ParserContext): Promise<HttpRegionParserResult> {
    if (context.httpRegion.request) {
      const requestBody = this.getRequestBody(context);
      const next = lineReader.next();
      if (!next.done) {


        if (requestBody.textLines.length > 0 || !isStringEmpty(next.value.textLine)) {
          const forceInjectVariables = (filename: string) => {
            if (context.httpRegion.metaData.injectVariables) {
              return true;
            }
            if (context.environmentConfig?.requestBodyInjectVariablesExtensions) {
              const extname = fileProvider.extname(filename);
              return context.environmentConfig.requestBodyInjectVariablesExtensions
                .indexOf(extname) >= 0;
            }
            return false;
          };
          requestBody.textLines.push(await this.parseLine(next.value.textLine, context.httpFile.fileName, forceInjectVariables));
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
        textLines: [],
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

  private async parseLine(textLine: string, httpFileName: PathLike, forceInjectVariables: (fileName: string) => boolean) {
    const fileImport = ParserRegex.request.fileImport.exec(textLine);
    if (fileImport && fileImport.length === 4 && fileImport.groups) {
      try {
        const normalizedPath = await toAbsoluteFilename(fileImport.groups.fileName, httpFileName);
        if (normalizedPath) {
          if (forceInjectVariables(fileImport.groups.fileName) || fileImport.groups.injectVariables) {
            return await fileProvider.readFile(normalizedPath, this.getBufferEncoding(fileImport.groups.encoding));
          }
          return async () => fileProvider.readBuffer(normalizedPath);
        }
        popupService.warn(`request body file ${fileImport.groups.fileName} not found`);
        log.warn(`request body file ${fileImport.groups.fileName} not found`);

      } catch (err) {
        log.trace(err);
      }
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
      const contentType = context.httpRegion.request.contentType;

      this.removeTrailingEmptyLines(requestBody.textLines);
      if (requestBody.textLines.length > 0) {
        if (isMimeTypeFormUrlEncoded(contentType)) {
          context.httpRegion.request.body = this.formUrlEncodedJoin(requestBody.textLines);
        } else {
          if (requestBody.textLines.every(obj => isString(obj)) && isMimeTypeNewlineDelimitedJSON(contentType)) {
            requestBody.textLines.push('');
          }

          const body: Array<HttpRequestBodyLine> = [];
          const strings: Array<string> = [];
          const lineEnding = isMimeTypeMultiPartFormData(contentType) ? '\r\n' : EOL;

          for (const line of requestBody.textLines) {
            if (isString(line)) {
              strings.push(line);
            } else {
              if (strings.length > 0) {
                strings.push(lineEnding);
                body.push(strings.join(lineEnding));
                strings.length = 0;
              }
              body.push(line);
            }
          }

          if (strings.length > 0 && body.length === 0) {
            context.httpRegion.request.body = strings.join(lineEnding);
          } else {
            if (strings.length > 0) {
              body.push(strings.join(lineEnding));
            }
            context.httpRegion.request.body = body;
          }
        }
      }
    }
  }

  private formUrlEncodedJoin(body: Array<HttpRequestBodyLine>): string {
    const result = body.reduce((previousValue, currentValue, currentIndex) => {
      let prev = previousValue;
      if (isString(currentValue)) {
        prev += `${(currentIndex === 0 || currentValue.startsWith('&') ? '' : EOL)}${currentValue}`;
      }
      return prev;
    }, '');
    if (isString(result)) {
      return result;
    }
    return '';
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
