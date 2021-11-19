import { log } from '../io';
import * as models from '../models';
import * as utils from '../utils';
import * as metaData from './metaData';
import { ParserRegex } from './parserRegex';

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
          endOffset: textLine.length,
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

export function parseComments(
  httpLine: models.HttpLine,
  context: models.ParserContext,
  metaRegex: RegExp
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
    const match = ParserRegex.meta.data.exec(httpLine.textLine);
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
      const metaDataHandlers = [
        metaData.importMetaDataHandler,
        metaData.keepStreamingMetaDataHandler,
        metaData.loopMetaDataHandler,
        metaData.rateLimitMetaDataHandler,
        metaData.refMetaDataHandler,
        metaData.responseRefMetaDataHandler,
        metaData.sleepMetaDataHandler,
        metaData.verboseMetaDataHandler,
      ];
      metaDataHandlers.push(metaData.defaultMetaDataHandler);
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
    description: 'wait specified millisecondes, before next step.',
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
