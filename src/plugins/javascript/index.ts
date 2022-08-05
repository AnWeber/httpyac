import * as httpyac from '../..';
import * as models from '../../models';
import { parseJavascript } from './javascriptHttpRegionParser';
import { replaceJavascriptExpressions } from './javascriptVariableReplacer';
import * as moduleUtils from './moduleUtils';
import { default as dayjs } from 'dayjs';
import * as uuid from 'uuid';

// register early to allow using imported Javascript Plugins
httpyac.io.javascriptProvider.loadModule = moduleUtils.loadModule;

export function registerJavascriptPlugin(api: models.HttpyacHooksApi) {
  api.hooks.replaceVariable.addHook('javascript', replaceJavascriptExpressions, { before: ['aws'] });
  api.hooks.parse.addHook('javascript', parseJavascript, { before: ['request'] });

  addDefaultRequire();
  httpyac.io.javascriptProvider.evalExpression = moduleUtils.evalExpression;
  httpyac.io.javascriptProvider.runScript = moduleUtils.runScript;
  httpyac.io.javascriptProvider.isAllowedKeyword = moduleUtils.isAllowedKeyword;
}

function addDefaultRequire() {
  Object.assign(httpyac.io.javascriptProvider.require, {
    httpyac,
    dayjs,
    uuid,
  });
}
