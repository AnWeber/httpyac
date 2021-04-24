import { ProcessorContext, VariableReplacer, VariableReplacerType } from '../../models';

export class HostVariableReplacer implements VariableReplacer {
  type = 'host';
  async replace(text: string, type: VariableReplacerType | string, { variables }: ProcessorContext): Promise<string | undefined> {
    if (VariableReplacerType.url === type && !!variables.host) {
      if (text.startsWith('/')) {
        return `${variables.host}${text}`;
      }
    }
    return text;
  }
}
