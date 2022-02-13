import * as models from '../models';
import { report } from './logUtils';
import { evalExpression } from './moduleUtils';

export type ParseLineMethod = (
  httpLine: models.HttpLine,
  context: models.ParserContext
) => models.SymbolParserResult | false;

export interface ParseSubsequentLinesResult {
  nextLine?: number;
  parseResults: Array<models.SymbolParserResult>;
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
    const headerMatch = /^\s*(?<key>[!#$%&'*+\-.^_`|~0-9A-Za-z]+)\s*:\s*(?<value>.*?),?\s*$/u.exec(httpLine.textLine);
    if (headerMatch?.groups?.key) {
      const headerName = headerMatch.groups.key;
      const headerValue = headerMatch.groups.value;

      const existingHeader = headers[headerName];
      if (existingHeader) {
        if (Array.isArray(existingHeader)) {
          existingHeader.push(headerValue);
        } else {
          headers[headerName] = [existingHeader, headerValue];
        }
      } else {
        headers[headerName] = headerValue;
      }

      return {
        symbols: [
          {
            name: headerName,
            description: headerValue,
            kind: models.HttpSymbolKind.requestHeader,
            startLine: httpLine.line,
            startOffset: httpLine.textLine.indexOf(headerName),
            endLine: httpLine.line,
            endOffset: httpLine.textLine.length,
            children: [
              {
                name: headerName,
                description: 'request header key',
                kind: models.HttpSymbolKind.key,
                startLine: httpLine.line,
                startOffset: httpLine.textLine.indexOf(headerName),
                endLine: httpLine.line,
                endOffset: httpLine.textLine.indexOf(headerName) + headerName.length,
              },
              {
                name: headerValue,
                description: 'request header value',
                kind: models.HttpSymbolKind.value,
                startLine: httpLine.line,
                startOffset: httpLine.textLine.indexOf(headerValue),
                endLine: httpLine.line,
                endOffset: httpLine.textLine.indexOf(headerValue) + headerValue.length,
              },
            ],
          },
        ],
      };
    }
    return false;
  };
}

export function parseDefaultHeadersFactory(
  setHeaders: (headers: Record<string, unknown>, context: models.ProcessorContext) => void
): ParseLineMethod {
  return function parseDefaultHeaders(
    httpLine: models.HttpLine,
    parserContext: models.ParserContext
  ): models.SymbolParserResult | false {
    const fileHeaders = /^\s*\.{3}(?<variableName>[^\s]+),?\s*$/u.exec(httpLine.textLine);
    if (fileHeaders?.groups?.variableName) {
      const defaultsHeadersAction = new DefaultHeadersAction(fileHeaders.groups.variableName, setHeaders);
      parserContext.httpRegion.hooks.execute.addObjHook(obj => obj.process, defaultsHeadersAction);
      const val = httpLine.textLine.trim();
      return {
        symbols: [
          {
            name: val,
            description: 'Header Variable',
            kind: models.HttpSymbolKind.requestHeader,
            startLine: httpLine.line,
            startOffset: httpLine.textLine.indexOf(val),
            endOffset: httpLine.textLine.length,
            endLine: httpLine.line,
          },
        ],
      };
    }
    return false;
  };
}

class DefaultHeadersAction {
  id = 'defaultHeaders';

  constructor(
    private readonly data: string,
    private readonly setHeaders: (headers: Record<string, unknown>, context: models.ProcessorContext) => void
  ) {}

  async process(context: models.ProcessorContext): Promise<boolean> {
    if (this.data && context.variables) {
      report(context, 'set request headers');
      const headers = await evalExpression(this.data, context);
      if (headers) {
        this.setHeaders(Object.assign({}, headers), context);
      }
    }
    return true;
  }
}

export function parseUrlLineFactory(attachUrl: (url: string) => void): ParseLineMethod {
  return function parseUrlLine(httpLine: models.HttpLine) {
    if (/^\s*(\/).*$/u.test(httpLine.textLine)) {
      const val = httpLine.textLine.trim();
      attachUrl(val);
      return {
        symbols: [
          {
            name: val,
            description: 'URL Part',
            kind: models.HttpSymbolKind.url,
            startLine: httpLine.line,
            startOffset: httpLine.textLine.indexOf(val),
            endOffset: httpLine.textLine.length,
            endLine: httpLine.line,
          },
        ],
      };
    }
    return false;
  };
}

export function parseQueryLineFactory(attachUrl: (url: string) => void): ParseLineMethod {
  return function parseQueryLine(httpLine: models.HttpLine): models.SymbolParserResult | false {
    if (/^\s*(\?|&)([^=\s]+)=(.*)$/u.test(httpLine.textLine)) {
      const val = httpLine.textLine.trim();
      attachUrl(val);
      return {
        symbols: [
          {
            name: val,
            description: 'Query',
            kind: models.HttpSymbolKind.url,
            startLine: httpLine.line,
            startOffset: httpLine.textLine.indexOf(val),
            endOffset: httpLine.textLine.length,
            endLine: httpLine.line,
          },
        ],
      };
    }
    return false;
  };
}

export function parseComments(
  httpLine: models.HttpLine,
  context: models.ParserContext,
  metaRegex = /^\s*((#\s+)|(\/{2}))/u
): models.SymbolParserResult | false {
  if (metaRegex.test(httpLine.textLine)) {
    const result: models.SymbolParserResult = {
      symbols: [
        {
          name: 'comment',
          description: httpLine.textLine,
          kind: models.HttpSymbolKind.metaData,
          startLine: httpLine.line,
          startOffset: 0,
          endLine: httpLine.line,
          endOffset: httpLine.textLine.length,
        },
      ],
    };
    const match = /^\s*(#+|\/{2,})\s+@(?<key>[^\s]*)(\s+)?"?(?<value>.*)?"?$/u.exec(httpLine.textLine);
    if (match && match.groups && match.groups.key) {
      const key = match.groups.key.replace(/-./gu, value => value[1].toUpperCase());
      result.symbols[0].children = [
        {
          name: key,
          description: match.groups.value || '-',
          kind: models.HttpSymbolKind.metaData,
          startLine: httpLine.line,
          startOffset: 0,
          endLine: httpLine.line,
          endOffset: httpLine.textLine.length,
          children: [
            {
              name: key,
              description: knownMetaData.find(obj => obj.name === key)?.description || 'key of meta data',
              kind: models.HttpSymbolKind.key,
              startLine: httpLine.line,
              startOffset: httpLine.textLine.indexOf(match.groups.key),
              endLine: httpLine.line,
              endOffset: httpLine.textLine.indexOf(match.groups.key) + match.groups.key.length,
            },
          ],
        },
      ];
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
      context.httpFile.hooks.parseMetaData.trigger(key, match.groups.value, context);
    }
    return result;
  }
  return false;
}

export const knownMetaData: Array<{
  name: string;
  description: string;
  completions?: Array<string>;
}> = [
  {
    name: 'name',
    description:
      'responses of a requests with a name are automatically added as variables and can be reused by other requests',
    completions: ['${1}'],
  },
  {
    name: 'debug',
    description: 'enable debug log level',
  },
  {
    name: 'description',
    description: 'additional description of region',
    completions: ['${1}'],
  },
  {
    name: 'disabled',
    description: 'requests can be disabled',
  },
  {
    name: 'extension',
    description: 'extension of file for save or openWith.',
    completions: ['${1}'],
  },
  {
    name: 'forceRef',
    description: 'When the request is called, it is ensured that the referenced request is always called beforehand',
    completions: ['${1}'],
  },
  {
    name: 'import',
    description: 'reference Requests from other files.',
    completions: ['${1}'],
  },
  {
    name: 'injectVariables',
    description: 'Inject Variables in request body (needed because of compatibility with Intellij).',
  },
  {
    name: 'jwt',
    description: 'supports auto decode of jwt token.',
  },
  {
    name: 'language',
    description: 'language id of the response view',
    completions: ['${1}'],
  },
  {
    name: 'loop',
    description: 'allows multiple Invocations of a Request with different parameters.',
    completions: ['for ${1} of ${2}', 'for ${1}', 'while ${1}'],
  },
  {
    name: 'keepStreaming',
    description: 'keep streaming until the user session is ended manually',
  },
  {
    name: 'noLog',
    description: 'prevent logging of request data in output console',
  },
  {
    name: 'noCookieJar',
    description: 'cookieJar support is disabled for this request',
  },
  {
    name: 'noClientCert',
    description: 'SSL client certificate is not send for this request',
  },
  {
    name: 'noRejectUnauthorized',
    description: 'all invalid SSL certificates will be ignored and no error will be thrown.',
  },
  {
    name: 'noResponseView',
    description: 'prevent output in editor document.',
  },
  {
    name: 'noStreamingLog',
    description: 'prevent logging of streaming request data in output console',
  },
  {
    name: 'note',
    description: 'shows a confirmation dialog before sending request',
    completions: ['${1}'],
  },
  {
    name: 'openWith',
    description: 'viewType of custom editor to preview files',
    completions: ['${1}'],
  },
  {
    name: 'ref',
    description: 'When the request is called, it is ensured that the referenced request is called beforehand',
    completions: ['${1}'],
  },
  {
    name: 'ratelimit',
    description: 'allows throttling requests',
    completions: ['minIdleTime ${1}', 'max ${1} expire ${2}', 'minIdleTime ${1} max ${2} expire ${3}'],
  },
  {
    name: 'save',
    description: 'If specified, the response will not be displayed but saved directly.',
  },
  {
    name: 'sleep',
    description: 'wait specified milliseconds, before next step.',
    completions: ['${1}'],
  },
  {
    name: 'title',
    description: 'additional title of region',
    completions: ['${1}'],
  },
  {
    name: 'verbose',
    description: 'enable trace log level',
  },
];
