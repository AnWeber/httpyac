import { userInteractionProvider } from '../../io';
import { HookCancel } from '../../models';
import { ParserRegex } from '../../parser';
import { isString } from '../../utils';

export async function showQuickpickVariableReplacer(text: unknown): Promise<unknown> {
  if (!isString(text)) {
    return text;
  }
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = ParserRegex.javascript.scriptSingleLine.exec(result)) !== null) {
    const [searchValue, variable] = match;

    const matchInput = /^\$pick\s*(?<placeholder>[^$]*)(\$value:\s*(?<value>.*))\s*$/u.exec(variable);
    if (matchInput?.groups?.placeholder && matchInput?.groups?.value) {
      const placeholder = matchInput.groups.placeholder;
      const value = matchInput.groups.value;

      const answer = await userInteractionProvider.showListPrompt(placeholder, value.split(','));
      if (answer && result) {
        result = result.replace(searchValue, `${answer}`);
      } else {
        return HookCancel;
      }
    }
  }
  return result;
}
