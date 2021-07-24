import * as models from '../models';

import { parseComment } from './commentHttpRegionParser';
import { parseGraphql } from './gqlHttpRegionParser';
import { parseIntellijScript } from './intellijHttpRegionParser';
import { parseJavascript } from './jsHttpRegionParser';
import { parseMetaData } from './metaHttpRegionParser';
import { parseRequestBody, closeRequestBody } from './requestBodyHttpRegionParser';
import { parseRequestLine } from './requestHttpRegionParser';
import { parseResponse, closeResponseBody } from './responseHttpRegionParser';
import { parseResponseRef } from './responseRefHttpRegionParser';
import { parseVariable } from './variableHttpRegionParser';

import { injectOnEveryRequestJavascript } from './jsHttpRegionParser';
import { injectNote } from './noteMetaHttpRegionParser';


export enum ParserId {
  meta = 'meta',
  comment = 'comment',
  variable = 'variable',
  javascript = 'javascript',
  note = 'note',
  intellijScript = 'intellijScript',
  gql = 'gql',
  request = 'request',
  responseRef = 'responseRef',
  response = 'response',
  requestBody = 'requestBody'
}

export function initParseHook(): models.ParseHook {
  const hook = new models.ParseHook();

  hook.addHook(ParserId.meta, parseMetaData);
  hook.addHook(ParserId.comment, parseComment);
  hook.addHook(ParserId.variable, parseVariable);
  hook.addHook(ParserId.javascript, parseJavascript);
  hook.addHook(ParserId.intellijScript, parseIntellijScript);
  hook.addHook(ParserId.gql, parseGraphql);
  hook.addHook(ParserId.request, parseRequestLine);
  hook.addHook(ParserId.responseRef, parseResponseRef);
  hook.addHook(ParserId.response, parseResponse);
  hook.addHook(ParserId.requestBody, parseRequestBody);

  return hook;
}


export function initParseAfterRegionHook(): models.ParseAfterRegionHook {
  const hook = new models.ParseAfterRegionHook();

  hook.addHook(ParserId.javascript, injectOnEveryRequestJavascript);
  hook.addHook(ParserId.note, injectNote);
  hook.addHook(ParserId.response, closeResponseBody);
  hook.addHook(ParserId.requestBody, closeRequestBody);

  return hook;
}
