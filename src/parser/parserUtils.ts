import * as actions from '../actions';
import * as models from '../models';
import { ParserRegex } from './parserRegex';
import { parseComments as parseMetaComments } from './metaHttpRegionParser';

export type ParseLineMethod = (httpLine: models.HttpLine, context: models.ParserContext) => (models.SymbolParserResult | false);

export interface ParseSubsequentLinesResult{
  nextLine?: number;
  parseResults: Array<models.SymbolParserResult>
}

export function parseSubsequentLines(
  lineReader: models.HttpLineGenerator,
  requestLineParser: Array<ParseLineMethod>,
  context: models.ParserContext
): ParseSubsequentLinesResult {
  const result: ParseSubsequentLinesResult = {
    parseResults: [],
  };
  let next = lineReader.next();
  while (!next.done) {
    let hasResult = false;
    for (const lineParser of requestLineParser) {
      const parseResult = lineParser(next.value, context);
      if (parseResult) {
        result.parseResults.push(parseResult);
        hasResult = true;
        break;
      }
    }
    if (!hasResult) {
      break;
    }
    result.nextLine = next.value.line;

    next = lineReader.next();
  }

  return result;
}


export function parseRequestHeaderFactory(headers: Record<string, unknown>): ParseLineMethod {
  return function parseRequestHeader(httpLine: models.HttpLine) {
    const headerMatch = ParserRegex.request.header.exec(httpLine.textLine);
    if (headerMatch?.groups?.key && headerMatch?.groups?.value) {
      headers[headerMatch.groups.key] = headerMatch.groups.value;

      return {
        symbols: [{
          name: headerMatch.groups.key,
          description: headerMatch.groups.value,
          kind: models.HttpSymbolKind.requestHeader,
          startLine: httpLine.line,
          startOffset: httpLine.textLine.indexOf(headerMatch.groups.key),
          endLine: httpLine.line,
          endOffset: httpLine.textLine.length,
          children: [{
            name: headerMatch.groups.key,
            description: 'request header key',
            kind: models.HttpSymbolKind.key,
            startLine: httpLine.line,
            startOffset: httpLine.textLine.indexOf(headerMatch.groups.key),
            endLine: httpLine.line,
            endOffset: httpLine.textLine.indexOf(headerMatch.groups.key) + headerMatch.groups.key.length,
          }, {
            name: headerMatch.groups.value,
            description: 'request header value',
            kind: models.HttpSymbolKind.value,
            startLine: httpLine.line,
            startOffset: httpLine.textLine.indexOf(headerMatch.groups.value),
            endLine: httpLine.line,
            endOffset: httpLine.textLine.indexOf(headerMatch.groups.value) + headerMatch.groups.value.length,
          }
          ]
        }]
      };
    }
    return false;
  };
}


export function parseDefaultHeadersFactory(
  setHeaders: (headers: Record<string, unknown>, context: models.ProcessorContext) => void
): ParseLineMethod {
  return function parseDefaultHeaders(httpLine: models.HttpLine, parserContext: models.ParserContext): models.SymbolParserResult | false {
    const fileHeaders = ParserRegex.request.headersSpread.exec(httpLine.textLine);
    if (fileHeaders?.groups?.variableName) {
      parserContext.httpRegion.hooks.execute.addObjHook(obj => obj.process, new actions.DefaultHeadersAction(fileHeaders.groups.variableName, setHeaders));
      const val = httpLine.textLine.trim();
      return {
        symbols: [{
          name: val,
          description: 'header variable',
          kind: models.HttpSymbolKind.requestHeader,
          startLine: httpLine.line,
          startOffset: httpLine.textLine.indexOf(val),
          endOffset: httpLine.textLine.length,
          endLine: httpLine.line,
        }],
      };
    }
    return false;
  };
}


export function parseUrlLineFactory(attachUrl: ((url: string) => void)) : ParseLineMethod {
  return function parseUrlLine(httpLine: models.HttpLine) {
    if (ParserRegex.request.urlLine.test(httpLine.textLine)) {
      const val = httpLine.textLine.trim();
      attachUrl(val);
      return {
        symbols: [{
          name: val,
          description: 'urlpart',
          kind: models.HttpSymbolKind.url,
          startLine: httpLine.line,
          startOffset: httpLine.textLine.indexOf(val),
          endOffset: httpLine.textLine.length,
          endLine: httpLine.line,
        }]
      };
    }
    return false;
  };
}

export function parseQueryLineFactory(attachUrl: ((url: string) => void)): ParseLineMethod {
  return function parseQueryLine(httpLine: models.HttpLine): models.SymbolParserResult | false {
    if (ParserRegex.request.queryLine.test(httpLine.textLine)) {
      const val = httpLine.textLine.trim();
      attachUrl(val);
      return {
        symbols: [{
          name: val,
          description: 'query',
          kind: models.HttpSymbolKind.url,
          startLine: httpLine.line,
          startOffset: httpLine.textLine.indexOf(val),
          endOffset: httpLine.textLine.length,
          endLine: httpLine.line,
        }]
      };
    }
    return false;
  };
}


export function parseComments(httpLine: models.HttpLine, context: models.ParserContext): models.SymbolParserResult | false {
  return parseMetaComments(httpLine, context, ParserRegex.meta.comment);
}
