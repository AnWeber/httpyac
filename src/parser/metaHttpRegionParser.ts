import * as models from '../models';
import * as utils from '../utils';
import { ParserRegex } from './parserRegex';
import { log } from '../io';
import * as metaData from './metaData';


export async function parseMetaData(getLineReader: models.getHttpLineGenerator, context: models.ParserContext): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  const { httpRegion, data } = context;
  if (data.metaTitle) {
    httpRegion.metaData.title = data.metaTitle.trim();
    delete data.metaTitle;
  }

  const next = lineReader.next();
  if (!next.done) {
    const textLine = next.value.textLine;
    if (ParserRegex.meta.all.test(textLine)) {
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
      const delimiterMatch = ParserRegex.meta.delimiter.exec(textLine);
      if (delimiterMatch) {
        result.endRegionLine = next.value.line - 1;
        result.symbols.push({
          name: 'separator',
          description: delimiterMatch.groups?.title || '-',
          kind: models.HttpSymbolKind.metaData,
          startLine: next.value.line,
          startOffset: 0,
          endLine: next.value.line,
          endOffset: textLine.length
        });
        data.metaTitle = delimiterMatch.groups?.title;
      } else {
        const commentResult = parseComments(next.value, context, ParserRegex.meta.all);
        if (commentResult) {
          result.symbols = commentResult.symbols;
        }
      }
      return result;
    }
  }
  return false;
}


export function parseComments(httpLine: models.HttpLine, context: models.ParserContext, metaRegex: RegExp): models.SymbolParserResult | false {
  if (metaRegex.test(httpLine.textLine)) {
    const result: models.SymbolParserResult = {
      symbols: [{
        name: 'comment',
        description: httpLine.textLine,
        kind: models.HttpSymbolKind.metaData,
        startLine: httpLine.line,
        startOffset: 0,
        endLine: httpLine.line,
        endOffset: httpLine.textLine.length
      }]
    };
    const match = ParserRegex.meta.data.exec(httpLine.textLine);
    if (match && match.groups && match.groups.key) {
      result.symbols[0].children = [{
        name: match.groups.key,
        description: match.groups.value || '-',
        kind: models.HttpSymbolKind.metaData,
        startLine: httpLine.line,
        startOffset: 0,
        endLine: httpLine.line,
        endOffset: httpLine.textLine.length,
        children: [{
          name: match.groups.key,
          description: 'key of meta data',
          kind: models.HttpSymbolKind.key,
          startLine: httpLine.line,
          startOffset: httpLine.textLine.indexOf(match.groups.key),
          endLine: httpLine.line,
          endOffset: httpLine.textLine.indexOf(match.groups.key) + match.groups.key.length,
        }]
      }];
      if (match.groups.value) {
        result.symbols[0].children.push({
          name: match.groups.value,
          description: 'value of meta data',
          kind: models.HttpSymbolKind.value,
          startLine: httpLine.line,
          startOffset: httpLine.textLine.indexOf(match.groups.value),
          endLine: httpLine.line,
          endOffset: httpLine.textLine.indexOf(match.groups.value) + match.groups.value.length,
        });
      }
      const key = match.groups.key.replace(/-./gu, value => value[1].toUpperCase());
      const metaDataHandlers = [
        metaData.importMetaDataHandler,
        metaData.loopMetaDataHandler,
        metaData.refMetaDataHandler,
        metaData.responseRefMetaDataHandler,
        metaData.sleepMetaDataHandler,
        metaData.verboseMetaDataHandler,
        metaData.defaultMetaDataHandler,
      ];
      for (const metaDataHandler of metaDataHandlers) {
        if (metaDataHandler(key, match.groups.value, context)) {
          break;
        }
      }
    }
    return result;
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
