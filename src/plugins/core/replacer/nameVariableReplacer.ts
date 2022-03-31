import { ProcessorContext, VariableType } from '../../../models';
import * as utils from '../../../utils';

export async function replaceVariableNames(
  text: unknown,
  _type: VariableType | string,
  context: ProcessorContext
): Promise<unknown> {
  return utils.parseHandlebarsString(text, async (variable: string) => context.variables[variable]);
}
