import * as models from '../../../models';
import * as utils from '../../../utils';

export async function parseRequestBody(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();

  if (context.httpRegion.request) {
    const requestBody = getRequestBody(context);
    const next = lineReader.next();
    if (!next.done) {
      if (requestBody.rawBody.length > 0 || !utils.isStringEmpty(next.value.textLine)) {
        requestBody.rawBody.push(parseLine(next.value.textLine));
        const symbols: Array<models.HttpSymbol> = [];

        if (!requestBody.symbol || requestBody.symbol.endLine !== next.value.line - 1) {
          requestBody.symbol = {
            name: 'request body',
            description: 'request body',
            kind: models.HttpSymbolKind.requestBody,
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

function getRequestBody(context: models.ParserContext) {
  let result = context.data.request_body;
  if (!result) {
    result = {
      rawBody: [],
    };
    context.data.request_body = result;
  }
  return result;
}

function parseLine(textLine: string) {
  const fileImport = /^<(?:(?<injectVariables>@)(?<encoding>\w+)?)?\s+(?<fileName>.+?)\s*$/u.exec(textLine);
  if (fileImport && fileImport.length === 4 && fileImport.groups) {
    return {
      fileName: fileImport.groups.fileName,
      injectVariables: !!fileImport.groups.injectVariables,
      encoding: getBufferEncoding(fileImport.groups.encoding),
    };
  }
  return textLine;
}

function isBufferEncoding(encoding: string): encoding is BufferEncoding {
  return (
    ['ascii', 'utf8', 'utf-8', 'utf16le', 'ucs2', 'ucs-2', 'base64', 'latin1', 'binary', 'hex'].indexOf(encoding) >= 0
  );
}

function getBufferEncoding(encoding: string): BufferEncoding {
  if (encoding && isBufferEncoding(encoding)) {
    return encoding;
  }
  return 'utf8';
}
