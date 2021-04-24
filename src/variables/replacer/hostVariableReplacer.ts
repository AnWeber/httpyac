import { ProcessorContext, VariableReplacer, VariableReplacerType, VariableType } from '../../models';

export class HostVariableReplacer implements VariableReplacer {
  type = VariableReplacerType.host;
  async replace(text: string, type: VariableType | string, { variables }: ProcessorContext): Promise<string | undefined> {
    if (VariableType.url === type && !!variables.host) {
      if (text.startsWith('/')) {
        return `${variables.host}${text}`;
      }
    }
    return text;
  }
}
