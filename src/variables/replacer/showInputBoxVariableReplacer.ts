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

    const matchInput = /^\$input\s*(?<placeholder>[^$]*)(\$value:\s*(?<value>.*))?\s*$/u.exec(variable);
    if (matchInput?.groups?.placeholder) {
      const placeholder = matchInput.groups.placeholder;

      const answer = await userInteractionProvider.showInputPrompt(
        placeholder,
        lastValue[placeholder] || matchInput.groups.value
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
