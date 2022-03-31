import { userInteractionProvider } from '../../../io';
import * as utils from '../../../utils';
import { HookCancel } from 'hookpoint';

export async function showQuickpickVariableReplacer(text: unknown): Promise<unknown> {
  return utils.parseHandlebarsString(text, async (variable: string) => {
    const matchInput = /^\$pick\s*(?<placeholder>[^$]*)(\$value:\s*(?<value>.*))\s*$/u.exec(variable);
    if (matchInput?.groups?.placeholder && matchInput?.groups?.value) {
      const placeholder = matchInput.groups.placeholder;
      const value = matchInput.groups.value;

      const answer = await userInteractionProvider.showListPrompt(placeholder, value.split(','));
      if (answer) {
        return answer;
      }
      return HookCancel;
    }
    return undefined;
  });
}
