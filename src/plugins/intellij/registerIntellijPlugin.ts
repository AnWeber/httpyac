import './completionItemProvider';

import * as models from '../../models';
import { provideIntellijGlobalVariables } from './intellijGlobalVariableProvider';
import { parseIntellijScript } from './intellijHttpRegionParser';
import { replaceIntellijProjectContext } from './intellijProjectContextReplacer';
import { provideIntellijEnvironments, provideIntellijVariables } from './intellijVariableProvider';
import { replaceDynamicIntellijVariables } from './replacer';

export function registerIntellijPlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('intellijScript', parseIntellijScript, { before: ['request'] });
  api.hooks.provideEnvironments.addHook('intellij', provideIntellijEnvironments);
  api.hooks.provideVariables.addHook('intellij', provideIntellijVariables);
  api.hooks.provideVariables.addHook('intellij_global', provideIntellijGlobalVariables);
  api.hooks.replaceVariable.addHook('intellijDynamic', replaceDynamicIntellijVariables, { before: ['name'] });
  api.hooks.replaceVariable.addHook('intellijProjectContext', replaceIntellijProjectContext, { before: ['name'] });
}
