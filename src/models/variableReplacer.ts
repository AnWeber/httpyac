import { ProcessorContext } from './processorContext';
import { VariableType } from './variableType';


export interface VariableReplacer {
  type: VariableReplacerType | string;
  replace: (text: string, type: VariableType | string, context: ProcessorContext) => Promise<string | undefined>;
}


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
