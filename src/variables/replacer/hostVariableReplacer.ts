import { ProcessorContext, VariableReplacerType } from '../../models';

export async function hostVariableReplacer(text: string, type: VariableReplacerType | string, { variables}: ProcessorContext) {
  if (VariableReplacerType.url === type && !!variables.host) {
    if (text.startsWith("/")) {
      return `${variables.host}${text}`;
    }
  }
  return text;
}