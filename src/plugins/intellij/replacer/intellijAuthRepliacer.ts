import { parseHandlebarsString } from '../../../utils';
import { replaceIntellijVariableAuth } from './replaceIntellijVariableAuth';
import { replaceIntellijVariableRandom } from './replaceIntellijVariableRandom';

export async function replaceDynamicIntellijVariables(text: unknown): Promise<unknown> {
  return parseHandlebarsString(text, async (variable: string) => {
    const randomResult = replaceIntellijVariableRandom(variable);
    if (randomResult) {
      return randomResult;
    }
    return await replaceIntellijVariableAuth(variable);
  });
}
