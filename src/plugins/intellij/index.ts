import * as models from '../../models';
import { provideIntellijGlobalVariables } from './intellijGlobalVariableProvider';
import { parseIntellijScript } from './intellijHttpRegionParser';
import { provideIntellijEnvironments, provideIntellijVariables } from './intellijVariableProvider';

export function registerIntellijPlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('intellijScript', parseIntellijScript, { before: ['request'] });
  api.hooks.provideEnvironments.addHook('intellij', provideIntellijEnvironments);
  api.hooks.provideVariables.addHook('intellij', provideIntellijVariables);
  api.hooks.provideVariables.addHook('intellij_global', provideIntellijGlobalVariables);
}
