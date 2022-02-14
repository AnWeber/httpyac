import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { parseJavascript } from './javascriptHttpRegionParser';
import { replaceJavascriptExpressions } from './javascriptVariableReplacer';
import * as moduleUtils from './moduleUtils';

javascriptProvider.loadModule = moduleUtils.loadModule;
export function registerJavascriptPlugin(api: models.HttpyacHooksApi) {
  api.hooks.replaceVariable.addHook('javascript', replaceJavascriptExpressions, { before: ['aws'] });
  api.hooks.parse.addHook('javascript', parseJavascript, { before: ['request'] });

  javascriptProvider.evalExpression = moduleUtils.evalExpression;
  javascriptProvider.runScript = moduleUtils.runScript;
}
