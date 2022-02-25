import * as models from '../../models';
import * as utils from '../../utils';
import { AmqpClientAction } from './amqpClientAction';
import { AmqpRequest } from './amqpRequest';

const AmqpLine = /^\s*(amqp)\s*(?<url>.+?)\s*$/iu;
const AmqpProtocol = /^\s*amqp(s)?:\/\/(?<url>.+?)\s*$/iu;

export async function parseAmqpLine(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  const next = lineReader.next();
  if (!next.done && isValidAmqp(next.value.textLine, context.httpRegion)) {
    if (context.httpRegion.request) {
      return {
        endRegionLine: next.value.line - 1,
        nextParserLine: next.value.line - 1,
        symbols: [],
      };
    }

    const requestLine = getAmqpLine(next.value.textLine, next.value.line);
    if (!requestLine) {
      return false;
    }
    context.httpRegion.request = requestLine.request;
    const requestSymbol: models.HttpSymbol = {
      name: next.value.textLine,
      description: 'amqp request-line',
      kind: models.HttpSymbolKind.requestLine,
      startLine: next.value.line,
      startOffset: 0,
      endLine: next.value.line,
      endOffset: next.value.textLine.length,
      children: [requestLine.symbol],
    };

    const result: models.HttpRegionParserResult = {
      nextParserLine: next.value.line,
      symbols: [requestSymbol],
    };

    const headers = {};
    requestLine.request.headers = headers;

    const headersResult = utils.parseSubsequentLines(
      lineReader,
      [
        utils.parseComments,
        utils.parseRequestHeaderFactory(headers),
        utils.parseDefaultHeadersFactory((headers, context) => Object.assign(context.request?.headers, headers)),
        utils.parseUrlLineFactory(url => (requestLine.request.url += url)),
      ],
      context
    );

    if (headersResult) {
      result.nextParserLine = headersResult.nextLine || result.nextParserLine;
      for (const parseResult of headersResult.parseResults) {
        result.symbols?.push?.(...parseResult.symbols);
      }
    }

    context.httpRegion.hooks.execute.addObjHook(obj => obj.process, new AmqpClientAction());

    return result;
  }
  return false;
}

function getAmqpLine(textLine: string, line: number): { request: AmqpRequest; symbol: models.HttpSymbol } | undefined {
  const lineMatch = AmqpLine.exec(textLine);
  if (lineMatch && lineMatch.length > 1 && lineMatch.groups) {
    return {
      request: {
        url: lineMatch.groups.url,
        method: 'AMQP',
      },
      symbol: {
        name: lineMatch.groups.url,
        description: 'amqp url',
        kind: models.HttpSymbolKind.url,
        startLine: line,
        startOffset: 0,
        endLine: line,
        endOffset: textLine.length,
      },
    };
  }
  const protocolMatch = AmqpProtocol.exec(textLine);
  if (protocolMatch && protocolMatch.length > 1 && protocolMatch.groups) {
    return {
      request: {
        url: protocolMatch.groups.url,
        method: 'AMQP',
      },
      symbol: {
        name: protocolMatch.groups.url,
        description: 'amqp url',
        kind: models.HttpSymbolKind.url,
        startLine: line,
        startOffset: 0,
        endLine: line,
        endOffset: textLine.length,
      },
    };
  }
  return undefined;
}

function isValidAmqp(textLine: string, httpRegion: models.HttpRegion) {
  if (utils.isStringEmpty(textLine)) {
    return false;
  }

  if (AmqpLine.exec(textLine)?.groups?.url) {
    return true;
  }
  if (!httpRegion.request) {
    return AmqpProtocol.exec(textLine)?.groups?.url;
  }
  return false;
}
