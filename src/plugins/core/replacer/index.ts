import * as models from '../../../models';
import { awsAuthVariableReplacer } from './awsAuthVariableReplacer';
import { basicAuthVariableReplacer } from './basicAuthVariableReplacer';
import { clientCertVariableReplacer } from './clientCertVariableReplacer';
import { escapeVariableReplacer } from './escapeVariableReplacer';
import { hostVariableReplacer } from './hostVariableReplacer';
import { replaceVariableNames } from './nameVariableReplacer';
import { restClientVariableReplacer } from './restClientVariableReplacer';
import { showInputBoxVariableReplacer } from './showInputBoxVariableReplacer';
import { showQuickpickVariableReplacer } from './showQuickpickVariableReplacer';

export function initReplaceVariableHook(api: models.HttpyacHooksApi) {
  api.hooks.replaceVariable.addHook('showInputBox', showInputBoxVariableReplacer);
  api.hooks.replaceVariable.addHook('showQuickPick', showQuickpickVariableReplacer);
  api.hooks.replaceVariable.addHook('restClientDynamic', restClientVariableReplacer);
  api.hooks.replaceVariable.addHook('host', hostVariableReplacer);
  api.hooks.replaceVariable.addHook('name', replaceVariableNames);
  api.hooks.replaceVariable.addHook('aws', awsAuthVariableReplacer);
  api.hooks.replaceVariable.addHook('clientCertificate', clientCertVariableReplacer);
  api.hooks.replaceVariable.addHook('basicAuth', basicAuthVariableReplacer);
  api.hooks.replaceVariable.addHook('escape', escapeVariableReplacer);
}
