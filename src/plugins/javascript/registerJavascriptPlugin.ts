import './completionItemProvider';

import { default as dayjs } from 'dayjs';
import open from 'open';
import * as uuid from 'uuid';

import * as httpyac from '../..';
import * as models from '../../models';
import { GlobalVariablesInterceptor, provideGlobalVariableStore } from './globalVariableProvider';
import { parseJavascript } from './javascriptHttpRegionParser';
import { replaceJavascriptExpressions } from './javascriptVariableReplacer';
import * as moduleUtils from './moduleUtils';

// register early to allow using imported Javascript Plugins
httpyac.io.javascriptProvider.loadModule = moduleUtils.loadModule;

export function registerJavascriptPlugin(api: models.HttpyacHooksApi) {
  api.hooks.replaceVariable.addHook('javascript', replaceJavascriptExpressions, { before: ['aws'] });
  api.hooks.parse.addHook('javascript', parseJavascript, { before: ['request'] });
  api.hooks.execute.addInterceptor(new GlobalVariablesInterceptor());
  api.hooks.provideVariables.addHook('globalVariables', provideGlobalVariableStore);

  addDefaultRequire();
  httpyac.io.javascriptProvider.evalExpression = moduleUtils.evalExpression;
  httpyac.io.javascriptProvider.runScript = moduleUtils.runScript;
  httpyac.io.javascriptProvider.isAllowedKeyword = moduleUtils.isAllowedKeyword;
}

function addDefaultRequire() {
  Object.assign(httpyac.io.javascriptProvider.require, {
    httpyac,
    dayjs,
    open,
    uuid,
  });
}
