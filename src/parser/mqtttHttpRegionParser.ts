import * as actions from '../actions';
import * as models from '../models';
import * as utils from '../utils';
import { ParserRegex } from './parserRegex';
import * as parserUtils from './parserUtils';

export async function parseMQTTLine(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  const next = lineReader.next();
  if (!next.done && isValidMQTT(next.value.textLine, context.httpRegion)) {
    if (context.httpRegion.request) {
      return {
        endRegionLine: next.value.line - 1,
        nextParserLine: next.value.line - 1,
        symbols: [],
      };
    }

    const requestLine = getMQTTLine(next.value.textLine, next.value.line);
    if (!requestLine) {
      return false;
    }
    context.httpRegion.request = requestLine.request;
    const requestSymbol: models.HttpSymbol = {
      name: next.value.textLine,
      description: 'MQTT request-line',
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

    const headersResult = parserUtils.parseSubsequentLines(
      lineReader,
      [
        parserUtils.parseComments,
        parserUtils.parseRequestHeaderFactory(headers),
        parserUtils.parseDefaultHeadersFactory((headers, context) => Object.assign(context.request?.headers, headers)),
        parserUtils.parseUrlLineFactory(url => (requestLine.request.url += url)),
      ],
      context
    );

    if (headersResult) {
      result.nextParserLine = headersResult.nextLine || result.nextParserLine;
      for (const parseResult of headersResult.parseResults) {
        result.symbols?.push?.(...parseResult.symbols);
      }
    }

    context.httpRegion.hooks.execute.addObjHook(obj => obj.process, new actions.MQTTClientAction());

    context.httpRegion.hooks.execute.addInterceptor(new actions.CreateRequestInterceptor());

    return result;
  }
  return false;
}

function getMQTTLine(
  textLine: string,
  line: number
): { request: models.MQTTRequest; symbol: models.HttpSymbol } | undefined {
  const lineMatch = ParserRegex.stream.mqttLine.exec(textLine);
  if (lineMatch && lineMatch.length > 1 && lineMatch.groups) {
    return {
      request: {
        url: lineMatch.groups.url,
        method: 'MQTT',
      },
      symbol: {
        name: lineMatch.groups.url,
        description: 'MQTT Url',
        kind: models.HttpSymbolKind.url,
        startLine: line,
        startOffset: 0,
        endLine: line,
        endOffset: textLine.length,
      },
    };
  }
  const protocolMatch = ParserRegex.stream.mqttProtocol.exec(textLine);
  if (protocolMatch && protocolMatch.length > 1 && protocolMatch.groups) {
    return {
      request: {
        url: protocolMatch.groups.url,
        method: 'MQTT',
      },
      symbol: {
        name: protocolMatch.groups.url,
        description: 'MQTT Url',
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

function isValidMQTT(textLine: string, httpRegion: models.HttpRegion) {
  if (utils.isStringEmpty(textLine)) {
    return false;
  }

  if (ParserRegex.stream.mqttLine.exec(textLine)?.groups?.url) {
    return true;
  }
  if (!httpRegion.request) {
    return ParserRegex.stream.mqttProtocol.exec(textLine)?.groups?.url;
  }
  return false;
}
