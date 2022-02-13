import * as models from '../../models';
import { parseJavascript } from './javascriptHttpRegionParser';
import { replaceJavascriptExpressions } from './javascriptVariableReplacer';

export function registerJavascriptPlugin(api: models.HttpyacHooksApi) {
  api.hooks.replaceVariable.addHook('javascript', replaceJavascriptExpressions, { before: ['aws'] });
  api.hooks.parse.addHook('javascript', parseJavascript, { before: ['request'] });
}
