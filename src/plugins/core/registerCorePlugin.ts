import './completionItemProvider';

import * as models from '../../models';
import * as environments from './environments';
import * as execute from './execute';
import * as metaData from './metaData';
import * as parse from './parse';
import * as parseEnd from './parseEnd';
import * as replacer from './replacer';
import * as request from './request';
import * as response from './response';

export function registerCorePlugins(api: models.HttpyacHooksApi) {
  initOnRequestHook(api);
  initOnResponseHook(api);
  initParseHook(api);
  initExecuteInterceptor(api);
  initParseMetData(api);
  initParseEndHook(api);

  initProvideEnvironmentsHook(api);
  initReplaceVariableHook(api);
}

function initOnRequestHook(api: models.HttpyacHooksApi) {
  api.hooks.onRequest.addHook('attachDefaultHeaders', request.attachDefaultHeaders);
  api.hooks.onRequest.addHook('setEnvRequestOptions', request.setEnvRequestOptions);
  api.hooks.onRequest.addHook('resolveRequestBody', request.resolveRequestBody);
  api.hooks.onRequest.addHook('setDefaultHttpyacHeaders', request.setDefaultHttpyacHeaders);
  api.hooks.onRequest.addHook('requestVariableReplacer', request.requestVariableReplacer);
  api.hooks.onRequest.addHook('transformRequestBody', request.transformRequestBodyToBuffer);
  api.hooks.onRequest.addHook('transformMultilineFormUrlEncoded', request.transformMultilineFormUrlEncoded);
  api.hooks.onRequest.addHook('encodeRequestBody', request.encodeRequestBody);

  api.hooks.onRequest.addInterceptor(request.isTrustedInterceptor);
  api.hooks.onRequest.addInterceptor(request.excludeProxyInterceptor);
}

function initOnResponseHook(api: models.HttpyacHooksApi) {
  api.hooks.onResponse.addHook('handleMetaDataName', response.handleNameMetaData);
  api.hooks.onResponse.addHook('setLastResponseInVariables', response.setLastResponseInVariables);
  api.hooks.onResponse.addInterceptor(response.jsonResponseInterceptor);
}

function initParseHook(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('meta', parse.parseMetaData);
  api.hooks.parse.addHook('comment', parse.parseComment);
  api.hooks.parse.addHook('variable', parse.parseVariable);
  api.hooks.parse.addHook('request', parse.parseHttpRequestLine);
  api.hooks.parse.addHook('outputRedirection', parse.parseOutputRedirection);
  api.hooks.parse.addHook('responseRef', parse.parseResponseRef);
  api.hooks.parse.addHook('response', parse.parseResponse);
  api.hooks.parse.addHook('requestBody', parse.parseRequestBody);

  api.hooks.parse.addInterceptor(new parse.MultipartMixedInterceptor());
}
function initParseEndHook(api: models.HttpyacHooksApi) {
  api.hooks.parseEndRegion.addHook('registerCancelExecutionInterceptor', parseEnd.registerCancelExecutionInterceptor);
  api.hooks.parseEndRegion.addHook('response', parseEnd.closeResponseBody);
  api.hooks.parseEndRegion.addHook('requestBody', parseEnd.closeRequestBody);
}

function initReplaceVariableHook(api: models.HttpyacHooksApi) {
  api.hooks.replaceVariable.addHook('host', replacer.hostVariableReplacer);
  api.hooks.replaceVariable.addHook('name', replacer.replaceVariableNames);
  api.hooks.replaceVariable.addHook('file', replacer.replaceFileImport);
  api.hooks.replaceVariable.addHook('showInputBox', replacer.showInputBoxVariableReplacer);
  api.hooks.replaceVariable.addHook('showQuickPick', replacer.showQuickpickVariableReplacer);
  api.hooks.replaceVariable.addHook('restClientDynamic', replacer.restClientVariableReplacer);
  api.hooks.replaceVariable.addInterceptor(replacer.escapeVariableInterceptor);
}
function initParseMetData(api: models.HttpyacHooksApi) {
  api.hooks.parseMetaData.addHook('disabled', metaData.disabledMetaDataHandler);
  api.hooks.parseMetaData.addHook('import', metaData.importMetaDataHandler);
  api.hooks.parseMetaData.addHook('jwt', metaData.jwtMetaDataHandler);
  api.hooks.parseMetaData.addHook('keepStreaming', metaData.keepStreamingMetaDataHandler);
  api.hooks.parseMetaData.addHook('loop', metaData.loopMetaDataHandler);
  api.hooks.parseMetaData.addHook('noRedirect', metaData.noRedirectMetaDataHandler);
  api.hooks.parseMetaData.addHook('noRejectUnauthorized', metaData.noRejectUnauthorizedMetaDataHandler);
  api.hooks.parseMetaData.addHook('timeout', metaData.timeoutMetaDataHandler);
  api.hooks.parseMetaData.addHook('note', metaData.noteMetaDataHandler);
  api.hooks.parseMetaData.addHook('proxy', metaData.proxyMetaDataHandler);
  api.hooks.parseMetaData.addHook('rateLimit', metaData.rateLimitMetaDataHandler);
  api.hooks.parseMetaData.addHook('ref', metaData.refMetaDataHandler);
  api.hooks.parseMetaData.addHook('responseRef', metaData.responseRefMetaDataHandler);
  api.hooks.parseMetaData.addHook('sleep', metaData.sleepMetaDataHandler);
  api.hooks.parseMetaData.addHook('verbose', metaData.verboseMetaDataHandler);
  api.hooks.parseMetaData.addHook('forceRegionDelimiter', metaData.forceRegionDelimiterMetaDataHandler);
}

function initExecuteInterceptor(api: models.HttpyacHooksApi) {
  const processedHttpRegionInterceptor = new execute.ProcessedHttpRegionInterceptor();
  api.hooks.execute.addInterceptor(new execute.RegionScopedVariablesInterceptor());
  api.hooks.execute.addInterceptor(processedHttpRegionInterceptor);
  api.hooks.responseLogging.addInterceptor(processedHttpRegionInterceptor.getResponseLoggingInterceptor());
  api.hooks.execute.addInterceptor(new execute.CreateRequestInterceptor());
  api.hooks.execute.addInterceptor(new execute.LazyVariableInterceptor());
  api.hooks.execute.addInterceptor(new execute.LogResponseInterceptor());
}
function initProvideEnvironmentsHook(api: models.HttpyacHooksApi) {
  api.hooks.provideEnvironments.addHook('config', environments.provideConfigEnvironments);
  api.hooks.provideVariables.addHook('config', environments.provideConfigVariables);
  api.hooks.provideVariables.addHook('response', environments.provideLastResponseVariables);
}
