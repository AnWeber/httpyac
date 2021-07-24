import { ProcessorContext, VariableType } from '../../models';


export async function hostVariableReplacer(text: string, type: VariableType | string, { variables }: ProcessorContext): Promise<string | undefined> {
  if (VariableType.url === type && !!variables.host) {
    if (text.startsWith('/')) {
      return `${variables.host}${text}`;
    }
  }
  return text;
}
