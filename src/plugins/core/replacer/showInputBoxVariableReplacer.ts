import { userInteractionProvider } from '../../../io';
import * as utils from '../../../utils';
import { HookCancel } from 'hookpoint';

const lastValue: Record<string, string> = {};

export async function showInputBoxVariableReplacer(text: unknown): Promise<unknown> {
  if (!utils.isString(text)) {
    return text;
  }
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = utils.HandlebarsSingleLine.exec(text)) !== null) {
    const [searchValue, variable] = match;

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
        result = result.replace(searchValue, `${answer}`);
      } else {
        return HookCancel;
      }
    }
  }
  return result;
}
