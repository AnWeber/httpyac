import * as models from '../../models';
import * as utils from '../../utils';
import { GrpcRequest } from './grpcRequest';
import { GrpcRequestClient } from './grpcRequestClient';

const GrpcLine = /^\s*(GRPC|grpc)\s*(?<url>.+?)\s*$/u;
const GrpcProtocol = /^\s*grpc:\/\/(?<url>.+?)\s*$/u;

export async function parseGrpcLine(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  const next = lineReader.next();
  if (!next.done && isValidGrpc(next.value.textLine, context.httpRegion)) {
    if (context.httpRegion.request) {
      return {
        endRegionLine: next.value.line - 1,
        nextParserLine: next.value.line - 1,
        symbols: [],
      };
    }

    const grpcLine = getGrpcLine(next.value.textLine, next.value.line);
    if (!grpcLine) {
      return false;
    }
    context.httpRegion.request = grpcLine.request;
    const requestSymbol: models.HttpSymbol = {
      name: next.value.textLine,
      description: 'grpc request-line',
      kind: models.HttpSymbolKind.requestLine,
      startLine: next.value.line,
      startOffset: 0,
      endLine: next.value.line,
      endOffset: next.value.textLine.length,
      children: [grpcLine.symbol],
    };

    const result: models.HttpRegionParserResult = {
      nextParserLine: next.value.line,
      symbols: [requestSymbol],
    };

    const headers = {};
    grpcLine.request.headers = headers;

    const headersResult = await utils.parseSubsequentLines(
      lineReader,
      [
        utils.parseComments,
        utils.parseRequestHeaderFactory(headers),
        utils.parseDefaultHeadersFactory(),
        utils.parseUrlLineFactory(url => (grpcLine.request.url += url)),
      ],
      context
    );

    if (headersResult) {
      result.nextParserLine = headersResult.nextLine || result.nextParserLine;
      for (const parseResult of headersResult.parseResults) {
        result.symbols?.push?.(...parseResult.symbols);
      }
    }

    context.httpRegion.hooks.execute.addHook(
      'grpc',
      utils.executeRequestClientFactory((request, context) => new GrpcRequestClient(request, context))
    );

    return result;
  }
  return false;
}

function getGrpcLine(textLine: string, line: number): { request: GrpcRequest; symbol: models.HttpSymbol } | undefined {
  const lineMatch = GrpcLine.exec(textLine);
  if (lineMatch && lineMatch.length > 1 && lineMatch.groups) {
    return {
      request: {
        supportsStreaming: true,
        protocol: 'GRPC',
        url: lineMatch.groups.url,
        method: 'GRPC',
      },
      symbol: {
        name: lineMatch.groups.url,
        description: 'grpc url',
        kind: models.HttpSymbolKind.url,
        startLine: line,
        startOffset: 0,
        endLine: line,
        endOffset: textLine.length,
        children: utils.parseHandlebarsSymbols(textLine, line),
      },
    };
  }
  const protocolMatch = GrpcProtocol.exec(textLine);
  if (protocolMatch && protocolMatch.length > 1 && protocolMatch.groups) {
    return {
      request: {
        protocol: 'GRPC',
        url: protocolMatch.groups.url,
        method: 'GRPC',
      },
      symbol: {
        name: protocolMatch.groups.url,
        description: 'grpc url',
        kind: models.HttpSymbolKind.url,
        startLine: line,
        startOffset: 0,
        endLine: line,
        endOffset: textLine.length,
        children: utils.parseHandlebarsSymbols(textLine, line),
      },
    };
  }
  return undefined;
}

function isValidGrpc(textLine: string, httpRegion: models.HttpRegion) {
  if (utils.isStringEmpty(textLine)) {
    return false;
  }

  if (GrpcLine.exec(textLine)?.groups?.url) {
    return true;
  }
  if (!httpRegion.request) {
    return GrpcProtocol.exec(textLine)?.groups?.url;
  }
  return false;
}
