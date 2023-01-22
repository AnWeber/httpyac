import * as models from '../../models';
import * as utils from '../../utils';
import { MQTTRequest } from './mqttRequest';
import { MQTTRequestClient } from './mqttRequestClient';

const RegexMqttLine = /^\s*(mqtt(s)?)\s*(?<url>.+?)\s*$/iu;
const RegexMqttProtocol = /^\s*mqtt(s)?:\/\/(?<url>.+?)\s*$/iu;

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

    const headersResult = await utils.parseSubsequentLines(
      lineReader,
      [
        utils.parseComments,
        utils.parseRequestHeaderFactory(headers),
        utils.parseDefaultHeadersFactory(),
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

    context.httpRegion.hooks.execute.addHook(
      'mqtt',
      utils.executeRequestClientFactory((request, context) => new MQTTRequestClient(request, context))
    );

    return result;
  }
  return false;
}

function getMQTTLine(textLine: string, line: number): { request: MQTTRequest; symbol: models.HttpSymbol } | undefined {
  const lineMatch = RegexMqttLine.exec(textLine);
  if (lineMatch && lineMatch.length > 1 && lineMatch.groups) {
    return {
      request: {
        protocol: 'MQTT',
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
        children: utils.parseHandlebarsSymbols(textLine, line),
      },
    };
  }
  const protocolMatch = RegexMqttProtocol.exec(textLine);
  if (protocolMatch && protocolMatch.length > 1 && protocolMatch.groups) {
    return {
      request: {
        url: protocolMatch.groups.url,
        protocol: 'MQTT',
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
        children: utils.parseHandlebarsSymbols(textLine, line),
      },
    };
  }
  return undefined;
}

function isValidMQTT(textLine: string, httpRegion: models.HttpRegion) {
  if (utils.isStringEmpty(textLine)) {
    return false;
  }

  if (RegexMqttLine.exec(textLine)?.groups?.url) {
    return true;
  }
  if (!httpRegion.request) {
    return RegexMqttProtocol.exec(textLine)?.groups?.url;
  }
  return false;
}
