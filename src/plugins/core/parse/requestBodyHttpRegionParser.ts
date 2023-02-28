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
            children: utils.parseHandlebarsSymbols(next.value.textLine, next.value.line),
          };
          symbols.push(requestBody.symbol);
        } else {
          requestBody.symbol.endLine = next.value.line;
          requestBody.symbol.children?.push?.(...utils.parseHandlebarsSymbols(next.value.textLine, next.value.line));
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
  return utils.parseFileImport(textLine) || textLine;
}
