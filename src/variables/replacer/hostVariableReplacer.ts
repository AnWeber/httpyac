import { ProcessorContext, VariableType } from '../../models';
import { isString } from '../../utils';

export async function hostVariableReplacer(
  text: unknown,
  type: VariableType | string,
  { variables }: ProcessorContext
): Promise<unknown> {
  if (isString(text) && VariableType.url === type && !!variables.host) {
    if (text.startsWith('/')) {
      return `${variables.host}${text}`;
    }
  }
  return text;
}
