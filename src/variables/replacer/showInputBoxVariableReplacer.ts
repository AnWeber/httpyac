import { HookCancel } from '../../models';
import { userInteractionProvider } from '../../io';

const lastValue: Record<string, string> = {};


export async function showInputBoxVariableReplacer(text: string): Promise<string | undefined | typeof HookCancel> {
  const variableRegex = /\{{2}(.+?)\}{2}/gu;
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = variableRegex.exec(text)) !== null) {
    const [searchValue, variable] = match;

    const matchInput = /^\$input\s*(?<placeholder>[^$]*)(\$value:\s*(?<value>.*))?\s*$/u.exec(variable);
    if (matchInput?.groups?.placeholder) {

      const placeholder = matchInput.groups.placeholder;

      const answer = await userInteractionProvider.showInputPrompt(placeholder, lastValue[placeholder] || matchInput.groups.value);

      if (answer) {
        lastValue[placeholder] = answer;
        result = result.replace(searchValue, `${answer}`);
      }
      return HookCancel;
    }
  }
  return result;
}
