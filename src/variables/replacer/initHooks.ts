import { ReplaceVariableHook } from '../../models';
import { awsAuthVariableReplacer } from './awsAuthVariableReplacer';
import { basicAuthVariableReplacer } from './basicAuthVariableReplacer';
import { clientCertVariableReplacer } from './clientCertVariableReplacer';
import { digestAuthVariableReplacer } from './digestAuthVariableReplacer';
import { escapeVariableReplacer } from './escapeVariableReplacer';
import { hostVariableReplacer } from './hostVariableReplacer';
import { intellijVariableReplacer } from './intellijVariableReplacer';
import { javascriptVariableReplacer } from './javascriptVariableReplacer';
import { openIdVariableReplacer } from './openIdVariableReplacer';
import { restClientVariableReplacer } from './restClientVariableReplacer';
import { showInputBoxVariableReplacer } from './showInputBoxVariableReplacer';
import { showQuickpickVariableReplacer } from './showQuickpickVariableReplacer';


export enum VariableReplacerType{
  aws = 'aws',
  basicAuth = 'basicAuth',
  clientCertificate = 'clientCertificate',
  digestAuth = 'digestAuth',
  escape = 'escape',
  oauth2 = 'oauth2',
  host = 'host',
  intellijDynamic = 'intellijDynamic',
  restClientDynamic = 'restClientDynamic',
  javascript = 'javascript',
  showInputBox = 'showInputBox',
  showQuickPick = 'showQuickPick'
}

export function initReplaceVariableHook(): ReplaceVariableHook {
  const hook = new ReplaceVariableHook();

  hook.addHook(VariableReplacerType.showInputBox, showInputBoxVariableReplacer);
  hook.addHook(VariableReplacerType.showQuickPick, showQuickpickVariableReplacer);
  hook.addHook(VariableReplacerType.restClientDynamic, restClientVariableReplacer);
  hook.addHook(VariableReplacerType.intellijDynamic, intellijVariableReplacer);
  hook.addHook(VariableReplacerType.javascript, javascriptVariableReplacer);
  hook.addHook(VariableReplacerType.host, hostVariableReplacer);
  hook.addHook(VariableReplacerType.oauth2, openIdVariableReplacer);
  hook.addHook(VariableReplacerType.aws, awsAuthVariableReplacer);
  hook.addHook(VariableReplacerType.clientCertificate, clientCertVariableReplacer);
  hook.addHook(VariableReplacerType.basicAuth, basicAuthVariableReplacer);
  hook.addHook(VariableReplacerType.digestAuth, digestAuthVariableReplacer);
  hook.addHook(VariableReplacerType.escape, escapeVariableReplacer);

  return hook;
}
