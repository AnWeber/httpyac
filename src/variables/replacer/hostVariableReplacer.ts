import { ProcessorContext, VariableReplacerType } from '../../models';

export async function hostVariableReplacer(text: string, type: VariableReplacerType | string, { variables }: ProcessorContext) : Promise<string | undefined> {
  if (VariableReplacerType.url === type && !!variables.host) {
    if (text.startsWith('/')) {
      return `${variables.host}${text}`;
    }
  }
  return text;
}
