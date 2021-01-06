
import { HttpRegion, HttpFile} from '../httpRegion';
import { EOL } from 'os';
import { HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult } from './httpRegionParser';
import { normalizeFileName, isString, isMimeTypeMultiPartFormData, isStringEmpty, isMimeTypeNewlineDelimitedJSON, isMimeTypeFormUrlEncoded } from '../utils';
import { createReadStream, promises as fs } from 'fs';
import { log } from '../logger';

const REGEX_IMPORTFILE = /^<(?:(?<injectVariables>@)(?<encoding>\w+)?)?\s+(?<fileName>.+?)\s*$/;

type RequestBodyLineType = string | (() => Promise<Buffer>);

export class RequestBodyHttpRegionParser implements HttpRegionParser {

  private bodyLines: Array<RequestBodyLineType> = [];

  async parse(lineReader: HttpRegionParserGenerator, httpRegion: HttpRegion, httpFile: HttpFile): Promise<HttpRegionParserResult> {
    if (httpRegion.position.requestLine) {
      let next = lineReader.next();
      if (!next.done) {
        if (this.bodyLines.length > 0 || !isStringEmpty(next.value.textLine)) {
          this.bodyLines.push(await this.parseLine(next.value.textLine, httpFile.fileName));
          return {
            endLine: next.value.line
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
        const normalizedPath = await normalizeFileName(fileImport.groups.fileName, httpFileName);
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


  close(httpRegion: HttpRegion): void {
    if (httpRegion.request) {
      const contentType = httpRegion.request.contentType;

      this.removeTrailingEmptyLines(this.bodyLines);

      this.removeTrailingEmptyLines(this.bodyLines);
      if (this.bodyLines.length > 0) {
        if (isMimeTypeFormUrlEncoded(contentType)) {
          httpRegion.request.body = this.formUrlEncodedJoin(this.bodyLines);
        } else if(this.bodyLines.every(obj => isString(obj))) {
          if (isMimeTypeNewlineDelimitedJSON(contentType)) {
            this.bodyLines.push('');
          }
          httpRegion.request.body = this.bodyLines.join(isMimeTypeMultiPartFormData(contentType) ? '\r\n' : EOL);
        } else {
          httpRegion.request.body = this.bodyLines;
        }
      }
      this.reset();
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

  reset() {
    this.bodyLines = [];
  }
}


