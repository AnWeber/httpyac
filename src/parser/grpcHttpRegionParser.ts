import * as actions from '../actions';
import * as models from '../models';
import * as utils from '../utils';
import { ParserRegex } from './parserRegex';
import * as parserUtils from './parserUtils';

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

    const headersResult = parserUtils.parseSubsequentLines(
      lineReader,
      [
        parserUtils.parseComments,
        parserUtils.parseRequestHeaderFactory(headers),
        parserUtils.parseDefaultHeadersFactory((headers, context) => Object.assign(context.request?.headers, headers)),
        parserUtils.parseUrlLineFactory(url => (grpcLine.request.url += url)),
      ],
      context
    );

    if (headersResult) {
      result.nextParserLine = headersResult.nextLine || result.nextParserLine;
      for (const parseResult of headersResult.parseResults) {
        result.symbols?.push?.(...parseResult.symbols);
      }
    }

    context.httpRegion.hooks.execute.addObjHook(obj => obj.process, new actions.GrpcClientAction());

    context.httpRegion.hooks.execute.addInterceptor(new actions.CreateRequestInterceptor());

    return result;
  }
  return false;
}

function getGrpcLine(
  textLine: string,
  line: number
): { request: models.GrpcRequest; symbol: models.HttpSymbol } | undefined {
  const lineMatch = ParserRegex.grpc.grpcLine.exec(textLine);
  if (lineMatch && lineMatch.length > 1 && lineMatch.groups) {
    return {
      request: {
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
      },
    };
  }
  const protocolMatch = ParserRegex.grpc.grpcProtocol.exec(textLine);
  if (protocolMatch && protocolMatch.length > 1 && protocolMatch.groups) {
    return {
      request: {
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
      },
    };
  }
  return undefined;
}

function isValidGrpc(textLine: string, httpRegion: models.HttpRegion) {
  if (utils.isStringEmpty(textLine)) {
    return false;
  }

  if (ParserRegex.grpc.grpcLine.exec(textLine)?.groups?.url) {
    return true;
  }
  if (!httpRegion.request) {
    return ParserRegex.grpc.grpcProtocol.exec(textLine)?.groups?.url;
  }
  return false;
}
