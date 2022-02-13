import { userInteractionProvider } from '../../../io';
import * as utils from '../../../utils';
import { HookCancel } from 'hookpoint';

export async function showQuickpickVariableReplacer(text: unknown): Promise<unknown> {
  if (!utils.isString(text)) {
    return text;
  }
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = utils.HandlebarsSingleLine.exec(result)) !== null) {
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
