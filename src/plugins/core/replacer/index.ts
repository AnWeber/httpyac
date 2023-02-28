import * as models from '../../../models';
import { escapeVariableInterceptor } from './escapeVariableReplacer';
import { replaceFileImport } from './fileVariableReplacer';
import { hostVariableReplacer } from './hostVariableReplacer';
import { replaceVariableNames } from './nameVariableReplacer';
import { restClientVariableReplacer } from './restClientVariableReplacer';
import { showInputBoxVariableReplacer } from './showInputBoxVariableReplacer';
import { showQuickpickVariableReplacer } from './showQuickpickVariableReplacer';

export function initReplaceVariableHook(api: models.HttpyacHooksApi) {
  api.hooks.replaceVariable.addHook('host', hostVariableReplacer);
  api.hooks.replaceVariable.addHook('name', replaceVariableNames);
  api.hooks.replaceVariable.addHook('file', replaceFileImport);
  api.hooks.replaceVariable.addHook('showInputBox', showInputBoxVariableReplacer);
  api.hooks.replaceVariable.addHook('showQuickPick', showQuickpickVariableReplacer);
  api.hooks.replaceVariable.addHook('restClientDynamic', restClientVariableReplacer);
  api.hooks.replaceVariable.addInterceptor(escapeVariableInterceptor);
}
