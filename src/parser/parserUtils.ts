import { DefaultHeadersAction } from '../actions';
import * as models from '../models';
import { ParserRegex } from './parserRegex';

export interface ParseLineResult {
  symbols: Array<models.HttpSymbol>,
  actions?: Array<models.HttpRegionAction>
}
export type ParseLineMethod = (textLine: string, line: number) => (ParseLineResult | false);

export interface ParseSubsequentLinesResult{
  nextLine?: number;
  parseResults: Array<ParseLineResult>
}

export function parseSubsequentLines(lineReader: models.HttpLineGenerator, requestLineParser: Array<ParseLineMethod>) : ParseSubsequentLinesResult {
  const result: ParseSubsequentLinesResult = {
    parseResults: [],
  };
  let next = lineReader.next();
  while (!next.done) {
    let hasResult = false;
    for (const lineParser of requestLineParser) {
      const parseResult = lineParser(next.value.textLine, next.value.line);
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
  return function parseRequestHeader(textLine: string, line: number) {
    const headerMatch = ParserRegex.request.header.exec(textLine);
    if (headerMatch?.groups?.key && headerMatch?.groups?.value) {
      headers[headerMatch.groups.key] = headerMatch.groups.value;

      return {
        symbols: [{
          name: headerMatch.groups.key,
          description: headerMatch.groups.value,
          kind: models.HttpSymbolKind.requestHeader,
          startLine: line,
          startOffset: textLine.indexOf(headerMatch.groups.key),
          endLine: line,
          endOffset: textLine.length,
          children: [{
            name: headerMatch.groups.key,
            description: 'request header key',
            kind: models.HttpSymbolKind.key,
            startLine: line,
            startOffset: textLine.indexOf(headerMatch.groups.key),
            endLine: line,
            endOffset: textLine.indexOf(headerMatch.groups.key) + headerMatch.groups.key.length,
          }, {
            name: headerMatch.groups.value,
            description: 'request header value',
            kind: models.HttpSymbolKind.value,
            startLine: line,
            startOffset: textLine.indexOf(headerMatch.groups.value),
            endLine: line,
            endOffset: textLine.indexOf(headerMatch.groups.value) + headerMatch.groups.value.length,
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
  return function parseDefaultHeaders(textLine: string, line: number): ParseLineResult | false {
    const fileHeaders = ParserRegex.request.headersSpread.exec(textLine);
    if (fileHeaders?.groups?.variableName) {
      const val = textLine.trim();
      return {
        symbols: [{
          name: val,
          description: 'header variable',
          kind: models.HttpSymbolKind.requestHeader,
          startLine: line,
          startOffset: textLine.indexOf(val),
          endOffset: textLine.length,
          endLine: line,
        }],
        actions: [new DefaultHeadersAction(fileHeaders.groups.variableName, setHeaders)]
      };
    }
    return false;
  };
}


export function parseUrlLineFactory(attachUrl: ((url: string) => void)) : ParseLineMethod {
  return function parseUrlLine(textLine: string, line: number) {
    if (ParserRegex.request.urlLine.test(textLine)) {
      const val = textLine.trim();
      attachUrl(val);
      return {
        symbols: [{
          name: val,
          description: 'urlpart',
          kind: models.HttpSymbolKind.url,
          startLine: line,
          startOffset: textLine.indexOf(val),
          endOffset: textLine.length,
          endLine: line,
        }]
      };
    }
    return false;
  };
}

export function parseQueryLineFactory(attachUrl: ((url: string) => void)): ParseLineMethod {
  return function parseQueryLine(textLine: string, line: number): ParseLineResult | false {
    if (ParserRegex.request.queryLine.test(textLine)) {
      const val = textLine.trim();
      attachUrl(val);
      return {
        symbols: [{
          name: val,
          description: 'query',
          kind: models.HttpSymbolKind.url,
          startLine: line,
          startOffset: textLine.indexOf(val),
          endOffset: textLine.length,
          endLine: line,
        }]
      };
    }
    return false;
  };
}
