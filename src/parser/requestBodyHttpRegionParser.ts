
import { HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext } from '../models';
import { EOL } from 'os';
import { toAbsoluteFilename, isString, isMimeTypeMultiPartFormData, isStringEmpty, isMimeTypeNewlineDelimitedJSON, isMimeTypeFormUrlEncoded } from '../utils';
import { createReadStream, promises as fs } from 'fs';
import { log } from '../logger';

const REGEX_IMPORTFILE = /^<(?:(?<injectVariables>@)(?<encoding>\w+)?)?\s+(?<fileName>.+?)\s*$/;

type RequestBodyLineType = string | (() => Promise<Buffer>);


const BODY_IDENTIFIER = 'body';
export class RequestBodyHttpRegionParser implements HttpRegionParser {

  async parse(lineReader: HttpRegionParserGenerator, context: ParserContext): Promise<HttpRegionParserResult> {
    if (context.httpRegion.request) {
      const bodyLines: Array<RequestBodyLineType> = context.data[BODY_IDENTIFIER] || [];
      let next = lineReader.next();
      if (!next.done) {
        if (bodyLines.length > 0 || !isStringEmpty(next.value.textLine)) {
          bodyLines.push(await this.parseLine(next.value.textLine, context.httpFile.fileName));
          context.data[BODY_IDENTIFIER] = bodyLines;
          return {
            endLine: next.value.line,
            symbols: [],
          };
        }
      }
    }
    return false;
  }

  private async parseLine(textLine: string, httpFileName: string) {
    const fileImport = REGEX_IMPORTFILE.exec(textLine);
    if (fileImport && fileImport.length === 4 && fileImport.groups) {
      try {
        const normalizedPath = await toAbsoluteFilename(fileImport.groups.fileName, httpFileName);
        if (normalizedPath) {
          if (fileImport.groups.injectVariables) {
            return await fs.readFile(normalizedPath, { encoding: this.getBufferEncoding(fileImport.groups.encoding) });
          } else {
            const stream = createReadStream(normalizedPath);
            return async () => await this.toBuffer(stream);
          }
        }
      } catch (err) {
        log.trace(err);
      }
    }
    return textLine;
  }

  private isBufferEncoding(encoding: string): encoding is BufferEncoding {
    return [ "ascii", "utf8", "utf-8",
      "utf16le", "ucs2", "ucs-2",
      "base64", "latin1", "binary", "hex"]
      .indexOf(encoding) >= 0;
  }

  private getBufferEncoding(encoding: string) : BufferEncoding{
    if (encoding && this.isBufferEncoding(encoding)) {
       return encoding;
    }
    return 'utf8';
  }

  private toBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const buffers: Buffer[] = [];
      stream.on('data', obj => {
        if (Buffer.isBuffer(obj)) {
          buffers.push(obj);
        } else {
          buffers.push(Buffer.from(obj));
        }
      });
      stream.on('end', () => resolve(Buffer.concat(buffers)));
      stream.on('error', error => reject(error));
      stream.resume();
    });
}


  close(context: ParserContext): void {
    if (context.httpRegion.request && context.data[BODY_IDENTIFIER]) {
      const contentType = context.httpRegion.request.contentType;

      const bodyLines: Array<RequestBodyLineType> = context.data[BODY_IDENTIFIER];
      delete context.data[BODY_IDENTIFIER];

      this.removeTrailingEmptyLines(bodyLines);
      if (bodyLines.length > 0) {
        if (isMimeTypeFormUrlEncoded(contentType)) {
          context.httpRegion.request.body = this.formUrlEncodedJoin(bodyLines);
        } else {
          if (bodyLines.every(obj => isString(obj)) && isMimeTypeNewlineDelimitedJSON(contentType)) {
            bodyLines.push('');
          }

          const body: Array<string | (() => Promise<Buffer>)> = [];
          const strings: Array<string> = [];
          const lineEnding = isMimeTypeMultiPartFormData(contentType) ?  '\r\n' : EOL;

          for (const line of bodyLines) {
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

  private formUrlEncodedJoin(body: Array<RequestBodyLineType>): string  {
    const result = body.reduce((previousValue, currentValue, currentIndex) => {
      if (isString(currentValue)) {
        previousValue += `${(currentIndex === 0 || currentValue.startsWith('&') ? '' : EOL)}${currentValue}`;
      }
      return previousValue;
    }, '');
    if (isString(result)) {
      return result;
    }
    return '';
  }

  removeTrailingEmptyLines(obj: Array<any>) {
    while (obj.length > 0 && isStringEmpty(obj[obj.length - 1])) {
      obj.pop();
    }
  }
}


