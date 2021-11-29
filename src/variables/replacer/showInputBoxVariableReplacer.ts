import { userInteractionProvider } from '../../io';
import { HookCancel } from '../../models';
import { ParserRegex } from '../../parser';
import { isString } from '../../utils';

const lastValue: Record<string, string> = {};

export async function showInputBoxVariableReplacer(text: unknown): Promise<unknown> {
  if (!isString(text)) {
    return text;
  }
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = ParserRegex.javascript.scriptSingleLine.exec(text)) !== null) {
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
