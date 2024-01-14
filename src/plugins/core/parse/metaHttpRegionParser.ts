import { log } from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';

const MetaDataRegex = /^\s*(#+|\/{2})/u;

export async function parseMetaData(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  const { httpRegion, data } = context;
  if (data.metaTitle) {
    httpRegion.metaData.title = data.metaTitle.trim();
    if (!httpRegion.metaData.name) {
      httpRegion.metaData.name = data.metaTitle.trim();
    }
    delete data.metaTitle;
  }

  const next = lineReader.next();
  if (!next.done) {
    const textLine = next.value.textLine;
    if (MetaDataRegex.test(textLine)) {
      if (isMarkdownRequest(context)) {
        if (textLine.trim() !== '###') {
          log.debug('request with markdown only supports delimiter after request line');
          return false;
        }
      }

      const result: models.HttpRegionParserResult = {
        nextParserLine: next.value.line,
        symbols: [],
      };
      const delimiterMatch = utils.RegionSeparator.exec(textLine);
      if (delimiterMatch) {
        result.endRegionLine = next.value.line - 1;
        result.symbols.push(
          new models.HttpSymbol({
            name: 'separator',
            description: delimiterMatch.groups?.title || '-',
            kind: models.HttpSymbolKind.metaData,
            startLine: next.value.line,
            startOffset: 0,
            endLine: next.value.line,
            endOffset: textLine.length,
          })
        );
        data.metaTitle = delimiterMatch.groups?.title;
      } else {
        const commentResult = await utils.parseComments(next.value, context, MetaDataRegex);
        if (commentResult) {
          result.symbols = commentResult.symbols;
        }
      }
      return result;
    }
  }
  return false;
}

function isMarkdownRequest(context: models.ParserContext) {
  if (context.httpRegion.request?.headers) {
    const contentType = utils.parseContentType(context.httpRegion.request.headers);
    if (utils.isMimeTypeMarkdown(contentType)) {
      return true;
    }
  }
  return false;
}
