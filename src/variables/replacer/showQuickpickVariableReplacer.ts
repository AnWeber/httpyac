import { HookCancel } from '../../models';
import { userInteractionProvider } from '../../io';


export async function showQuickpickVariableReplacer(text: string): Promise<string | undefined | typeof HookCancel> {

  const variableRegex = /\{{2}(.+?)\}{2}/gu;
  let match: RegExpExecArray | null;
  let result: string | undefined = text;
  while ((match = variableRegex.exec(text)) !== null) {
    const [searchValue, variable] = match;

    const matchInput = /^\$pick\s*(?<placeholder>[^$]*)(\$value:\s*(?<value>.*))\s*$/u.exec(variable);
    if (matchInput?.groups?.placeholder && matchInput?.groups?.value) {

      const placeholder = matchInput.groups.placeholder;
      const value = matchInput.groups.value;

      const answer = await userInteractionProvider.showListPrompt(placeholder, value.split(','));


      if (answer && result) {
        result = result.replace(searchValue, `${answer}`);
      }
      return HookCancel;
    }
  }
  return result;
}
