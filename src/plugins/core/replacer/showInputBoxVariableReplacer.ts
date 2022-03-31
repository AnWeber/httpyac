import { userInteractionProvider } from '../../../io';
import * as utils from '../../../utils';
import { HookCancel } from 'hookpoint';

const lastValue: Record<string, string> = {};

export async function showInputBoxVariableReplacer(text: unknown): Promise<unknown> {
  return utils.parseHandlebarsString(text, async (variable: string) => {
    const inputRegex = /^\$(?<type>(input|password))\s*(?<placeholder>[^$]*)(\$value:\s*(?<value>.*))?\s*$/u;
    const matchInput = inputRegex.exec(variable);
    if (matchInput?.groups?.placeholder) {
      const placeholder = matchInput.groups.placeholder;
      const inputType = matchInput.groups.type;

      const answer = await userInteractionProvider.showInputPrompt(
        placeholder,
        lastValue[placeholder] || matchInput.groups.value,
        inputType === 'password'
      );
      if (answer) {
        lastValue[placeholder] = answer;
        return answer;
      }
      return HookCancel;
    }
    return undefined;
  });
}
