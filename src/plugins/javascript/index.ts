import * as httpyac from '../..';
import * as models from '../../models';
import { parseJavascript } from './javascriptHttpRegionParser';
import { replaceJavascriptExpressions } from './javascriptVariableReplacer';
import * as moduleUtils from './moduleUtils';

// register early to allow using imported Javascript Plugins
httpyac.io.javascriptProvider.loadModule = moduleUtils.loadModule;

export function registerJavascriptPlugin(api: models.HttpyacHooksApi) {
  api.hooks.replaceVariable.addHook('javascript', replaceJavascriptExpressions, { before: ['aws'] });
  api.hooks.parse.addHook('javascript', parseJavascript, { before: ['request'] });

  httpyac.io.javascriptProvider.require.httpyac = httpyac;
  httpyac.io.javascriptProvider.evalExpression = moduleUtils.evalExpression;
  httpyac.io.javascriptProvider.runScript = moduleUtils.runScript;
}
