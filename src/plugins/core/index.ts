import * as models from '../../models';
import * as parser from '../../parser';
import { replacer } from '../../variables';
import { initProvideEnvironmentsHook } from './environments';
import { initParseMetData } from './metaData';
import { initOnRequestHook } from './request';
import { initOnResponseHook } from './response';

export function registerCorePlugins(api: models.HttpyacHooksApi) {
  initOnRequestHook(api);
  initOnResponseHook(api);
  initParseHook(api.hooks.parse);
  initParseMetData(api);
  initParseEndHook(api.hooks.parseEndRegion);

  initProvideEnvironmentsHook(api);

  initReplaceVariableHook(api.hooks.replaceVariable);
}

function initParseHook(hook: models.ParseHook) {
  hook.addHook('meta', parser.parseMetaData);
  hook.addHook('comment', parser.parseComment);
  hook.addHook('variable', parser.parseVariable);
  hook.addHook('request', parser.parseRequestLine);
  hook.addHook('outputRedirection', parser.parseOutputRedirection);
  hook.addHook('responseRef', parser.parseResponseRef);
  hook.addHook('response', parser.parseResponse);
  hook.addHook('requestBody', parser.parseRequestBody);
}

function initParseEndHook(hook: models.ParseEndRegionHook) {
  hook.addHook('registerCancelExecutionInterceptor', parser.registerCancelExecutionInterceptor);
  hook.addHook('response', parser.closeResponseBody);
  hook.addHook('requestBody', parser.closeRequestBody);
}

export function initReplaceVariableHook(hook: models.ReplaceVariableHook) {
  hook.addHook('showInputBox', replacer.showInputBoxVariableReplacer);
  hook.addHook('showQuickPick', replacer.showQuickpickVariableReplacer);
  hook.addHook('restClientDynamic', replacer.restClientVariableReplacer);
  hook.addHook('host', replacer.hostVariableReplacer);
  hook.addHook('name', replacer.replaceVariableNames);
  hook.addHook('aws', replacer.awsAuthVariableReplacer);
  hook.addHook('clientCertificate', replacer.clientCertVariableReplacer);
  hook.addHook('basicAuth', replacer.basicAuthVariableReplacer);
  hook.addHook('digestAuth', replacer.digestAuthVariableReplacer);
  hook.addHook('escape', replacer.escapeVariableReplacer);
}
