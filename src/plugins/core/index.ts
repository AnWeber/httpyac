import * as actions from '../../actions';
import * as models from '../../models';
import * as parser from '../../parser';
import { setAdditionalResponseBody } from '../../utils';
import { replacer } from '../../variables';
import { initProvideEnvironmentsHook } from './environments';
import { initParseMetData } from './metaData';

export function registerCorePlugins(api: models.HttpyacHooksApi) {
  initOnRequestHook(api.hooks.onRequest);
  initOnResponseHook(api.hooks.onResponse);
  initParseHook(api.hooks.parse);
  initParseMetData(api.hooks.parseMetaData);
  initParseEndHook(api.hooks.parseEndRegion);

  initProvideEnvironmentsHook(api);

  initReplaceVariableHook(api.hooks.replaceVariable);

  api.hooks.execute.addInterceptor(new actions.CreateRequestInterceptor());
  api.hooks.execute.addInterceptor(new actions.CookieJarInterceptor());
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

function initParseHook(hook: models.ParseHook) {
  hook.addInterceptor(new parser.MarkdownInterceptor());
  hook.addInterceptor(new parser.AsciidocInterceptor());

  hook.addHook('meta', parser.parseMetaData);
  hook.addHook('comment', parser.parseComment);
  hook.addHook('variable', parser.parseVariable);
  hook.addHook('javascript', parser.parseJavascript);
  hook.addHook('gql', parser.parseGraphql);
  hook.addHook('request', parser.parseRequestLine);
  hook.addHook('outputRedirection', parser.parseOutputRedirection);
  hook.addHook('responseRef', parser.parseResponseRef);
  hook.addHook('response', parser.parseResponse);
  hook.addHook('requestBody', parser.parseRequestBody);
}

function initParseEndHook(hook: models.ParseEndRegionHook) {
  hook.addHook('registerCancelExecutionInterceptor', parser.registerCancelExecutionInterceptor);
  hook.addHook('note', parser.injectNote);
  hook.addHook('response', parser.closeResponseBody);
  hook.addHook('requestBody', parser.closeRequestBody);
}

export function initReplaceVariableHook(hook: models.ReplaceVariableHook) {
  hook.addHook('showInputBox', replacer.showInputBoxVariableReplacer);
  hook.addHook('showQuickPick', replacer.showQuickpickVariableReplacer);
  hook.addHook('restClientDynamic', replacer.restClientVariableReplacer);
  hook.addHook('host', replacer.hostVariableReplacer);
  hook.addHook('name', replacer.replaceVariableNames);
  hook.addHook('javascript', replacer.replaceJavascriptExpressions);
  hook.addHook('aws', replacer.awsAuthVariableReplacer);
  hook.addHook('clientCertificate', replacer.clientCertVariableReplacer);
  hook.addHook('basicAuth', replacer.basicAuthVariableReplacer);
  hook.addHook('digestAuth', replacer.digestAuthVariableReplacer);
  hook.addHook('escape', replacer.escapeVariableReplacer);
}
