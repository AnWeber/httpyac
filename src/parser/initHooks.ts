import * as models from '../models';
import { registerCancelExecutionIntercepter } from './cancelExecutionInterceptor';
import { parseComment } from './commentHttpRegionParser';
import { parseEventSource } from './eventSourceHttpRegionParser';
import { parseGraphql } from './gqlHttpRegionParser';
import { parseGrpcLine } from './grpcHttpRegionParser';
import { parseIntellijScript } from './intellijHttpRegionParser';
import { parseJavascript } from './javascriptHttpRegionParser';
import { injectOnEveryRequestJavascript } from './javascriptHttpRegionParser';
import { parseMetaData } from './metaHttpRegionParser';
import { parseMQTTLine } from './mqtttHttpRegionParser';
import { injectNote } from './noteMetaHttpRegionParser';
import { parseOutputRedirection } from './outputRedirectionHttpRegionParser';
import { parseProtoImport } from './protoHttpRegionParser';
import { parseRequestBody, closeRequestBody } from './requestBodyHttpRegionParser';
import { parseRequestLine } from './requestHttpRegionParser';
import { parseResponse, closeResponseBody } from './responseHttpRegionParser';
import { parseResponseRef } from './responseRefHttpRegionParser';
import { parseVariable } from './variableHttpRegionParser';
import { parseWebsocketLine } from './websocketHttpRegionParser';

export enum ParserId {
  meta = 'meta',
  comment = 'comment',
  variable = 'variable',
  javascript = 'javascript',
  note = 'note',
  intellijScript = 'intellijScript',
  gql = 'gql',
  outputRedirection = 'outputRedirection',
  request = 'request',
  responseRef = 'responseRef',
  response = 'response',
  requestBody = 'requestBody',
  proto = 'proto',
  grpc = 'grpc',
  eventSource = 'eventSource',
  mqtt = 'mqtt',
  websocket = 'websocket',
}

export function initParseHook(): models.ParseHook {
  const hook = new models.ParseHook();

  hook.addHook(ParserId.meta, parseMetaData);
  hook.addHook(ParserId.comment, parseComment);
  hook.addHook(ParserId.variable, parseVariable);
  hook.addHook(ParserId.javascript, parseJavascript);
  hook.addHook(ParserId.intellijScript, parseIntellijScript);
  hook.addHook(ParserId.gql, parseGraphql);
  hook.addHook(ParserId.proto, parseProtoImport);
  hook.addHook(ParserId.grpc, parseGrpcLine);
  hook.addHook(ParserId.websocket, parseWebsocketLine);
  hook.addHook(ParserId.eventSource, parseEventSource);
  hook.addHook(ParserId.mqtt, parseMQTTLine);
  hook.addHook(ParserId.request, parseRequestLine);
  hook.addHook(ParserId.outputRedirection, parseOutputRedirection);
  hook.addHook(ParserId.responseRef, parseResponseRef);
  hook.addHook(ParserId.response, parseResponse);
  hook.addHook(ParserId.requestBody, parseRequestBody);

  return hook;
}

export function initParseEndHook(): models.ParseEndRegionHook {
  const hook = new models.ParseEndRegionHook();

  hook.addHook('registerCancelExecutionIntercepter', registerCancelExecutionIntercepter);
  hook.addHook(ParserId.note, injectNote);
  hook.addHook(ParserId.javascript, injectOnEveryRequestJavascript);
  hook.addHook(ParserId.response, closeResponseBody);
  hook.addHook(ParserId.requestBody, closeRequestBody);

  return hook;
}
