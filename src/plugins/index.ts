import * as actions from '../actions';
import * as models from '../models';
import * as parser from '../parser';
import { setAdditionalResponseBody } from '../utils';
import { provider, replacer } from '../variables';

export function registerPlugins(api: models.HttpyacHooksApi) {
  initOnRequestHook(api.hooks.onRequest);
  initOnResponseHook(api.hooks.onResponse);
  initParseHook(api.hooks.parse);
  initParseEndHook(api.hooks.parseEndRegion);

  initProvideVariablesHook(api.hooks.provideVariables);
  initProvideEnvironmentsHook(api.hooks.provideEnvironments);

  initReplaceVariableHook(api.hooks.replaceVariable);
}

function initOnRequestHook(hook: models.OnRequestHook) {
  hook.addHook('attachDefaultHeaders', actions.attachDefaultHeaders);
  hook.addHook('setEnvRequestOptions', actions.setEnvRequestOptions);
  hook.addHook('requestVariableReplacer', actions.requestVariableReplacer);
  hook.addHook('transformRequestBody', actions.transformRequestBody);
}

function initOnResponseHook(hook: models.OnResponseHook) {
  hook.addHook('addAdditionalBody', setAdditionalResponseBody);
  hook.addHook('responseAsVariable', actions.responseAsVariable);
}

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

function initParseHook(hook: models.ParseHook) {
  hook.addInterceptor(new parser.MarkdownInterceptor());

  hook.addHook(ParserId.meta, parser.parseMetaData);
  hook.addHook(ParserId.comment, parser.parseComment);
  hook.addHook(ParserId.variable, parser.parseVariable);
  hook.addHook(ParserId.javascript, parser.parseJavascript);
  hook.addHook(ParserId.intellijScript, parser.parseIntellijScript);
  hook.addHook(ParserId.gql, parser.parseGraphql);
  hook.addHook(ParserId.proto, parser.parseProtoImport);
  hook.addHook(ParserId.grpc, parser.parseGrpcLine);
  hook.addHook(ParserId.websocket, parser.parseWebsocketLine);
  hook.addHook(ParserId.eventSource, parser.parseEventSource);
  hook.addHook(ParserId.mqtt, parser.parseMQTTLine);
  hook.addHook(ParserId.request, parser.parseRequestLine);
  hook.addHook(ParserId.outputRedirection, parser.parseOutputRedirection);
  hook.addHook(ParserId.responseRef, parser.parseResponseRef);
  hook.addHook(ParserId.response, parser.parseResponse);
  hook.addHook(ParserId.requestBody, parser.parseRequestBody);
}

function initParseEndHook(hook: models.ParseEndRegionHook) {
  hook.addHook('registerCancelExecutionInterceptor', parser.registerCancelExecutionInterceptor);
  hook.addHook(ParserId.note, parser.injectNote);
  hook.addHook(ParserId.response, parser.closeResponseBody);
  hook.addHook(ParserId.requestBody, parser.closeRequestBody);
}

export enum VariableProviderType {
  config = 'config',
  dotenv = 'dotenv',
  httpFileImports = 'httpFileImports',
  httpFile = 'httpFile',
  intellij = 'intellij',
  intellijGlobal = 'intellijGlobal',
  lastResponse = 'last_response',
}

function initProvideVariablesHook(hook: models.ProvideVariablesHook) {
  hook.addHook(VariableProviderType.config, provider.provideConfigVariables);
  hook.addHook(VariableProviderType.dotenv, provider.provideDotenvVariables);
  hook.addHook(VariableProviderType.intellij, provider.provideIntellijVariables);
  hook.addHook(VariableProviderType.intellijGlobal, provider.provideIntellijGlobalVariables);
  hook.addHook(VariableProviderType.lastResponse, provider.provideLastResponseVariables);
}

function initProvideEnvironmentsHook(hook: models.ProvideEnvironmentsHook) {
  hook.addHook(VariableProviderType.config, provider.provideConfigEnvironments);
  hook.addHook(VariableProviderType.dotenv, provider.provideDotenvEnvironments);
  hook.addHook(VariableProviderType.intellij, provider.provideIntellijEnvironments);
}

export enum VariableReplacerType {
  aws = 'aws',
  basicAuth = 'basicAuth',
  clientCertificate = 'clientCertificate',
  digestAuth = 'digestAuth',
  escape = 'escape',
  oauth2 = 'oauth2',
  host = 'host',
  intellijDynamic = 'intellijDynamic',
  restClientDynamic = 'restClientDynamic',
  name = 'name',
  javascript = 'javascript',
  showInputBox = 'showInputBox',
  showQuickPick = 'showQuickPick',
}

export function initReplaceVariableHook(hook: models.ReplaceVariableHook) {
  hook.addHook(VariableReplacerType.showInputBox, replacer.showInputBoxVariableReplacer);
  hook.addHook(VariableReplacerType.showQuickPick, replacer.showQuickpickVariableReplacer);
  hook.addHook(VariableReplacerType.restClientDynamic, replacer.restClientVariableReplacer);
  hook.addHook(VariableReplacerType.intellijDynamic, replacer.intellijVariableReplacer);
  hook.addHook(VariableReplacerType.host, replacer.hostVariableReplacer);
  hook.addHook(VariableReplacerType.name, replacer.replaceVariableNames);
  hook.addHook(VariableReplacerType.javascript, replacer.replaceJavascriptExpressions);
  hook.addHook(VariableReplacerType.oauth2, replacer.oauth2VariableReplacer);
  hook.addHook(VariableReplacerType.aws, replacer.awsAuthVariableReplacer);
  hook.addHook(VariableReplacerType.clientCertificate, replacer.clientCertVariableReplacer);
  hook.addHook(VariableReplacerType.basicAuth, replacer.basicAuthVariableReplacer);
  hook.addHook(VariableReplacerType.digestAuth, replacer.digestAuthVariableReplacer);
  hook.addHook(VariableReplacerType.escape, replacer.escapeVariableReplacer);
}
