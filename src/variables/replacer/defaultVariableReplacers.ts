import { AwsAuthVariableReplacer } from './awsAuthVariableReplacer';
import { BasicAuthVariableReplacer } from './basicAuthVariableReplacer';
import { ClientCertVariableReplacer } from './clientCertVariableReplacer';
import { DigestAuthVariableReplacer } from './digestAuthVariableReplacer';
import { EscapeVariableReplacer } from './escapeVariableReplacer';
import { HostVariableReplacer } from './hostVariableReplacer';
import { IntellijVariableReplacer } from './intellijVariableReplacer';
import { JavascriptVariableReplacer } from './javascriptVariableReplacer';
import { OpenIdVariableReplacer } from './openIdVariableReplacer';
import { RestClientVariableReplacer } from './restClientVariableReplacer';
import { ShowInputBoxVariableReplacer } from './showInputBoxVariableReplacer';
import { ShowQuickpickVariableReplacer } from './showQuickpickVariableReplacer';


export const defaultVariableReplacers = [
  new ShowInputBoxVariableReplacer(),
  new ShowQuickpickVariableReplacer(),
  new RestClientVariableReplacer(),
  new IntellijVariableReplacer(),
  new JavascriptVariableReplacer(),
  new HostVariableReplacer(),
  new OpenIdVariableReplacer(),
  new AwsAuthVariableReplacer(),
  new ClientCertVariableReplacer(),
  new BasicAuthVariableReplacer(),
  new DigestAuthVariableReplacer(),
  new EscapeVariableReplacer(),
];
