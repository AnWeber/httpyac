import { ProcessorContext } from '../../models';

const lastValue: Record<string, string> = {};

export function showInputBoxVariableReplacerFactory(showInputPrompt: (message: string, defaultValue: string) => Promise<string | undefined>) {
  return async function showInputBoxVariableReplacer(text: string, _type: string, context: ProcessorContext) {

    const variableRegex = /\{{2}(.+?)\}{2}/g;
    let match: RegExpExecArray | null;
    let result = text;
    while ((match = variableRegex.exec(text)) !== null) {
      const [searchValue, variable] = match;

      const matchInput = /^\$input\s*(?<placeholder>[^\$]*)(\$value:\s*(?<value>.*))?\s*$/.exec(variable);
      if (matchInput?.groups?.placeholder) {

        const placeholder = matchInput.groups.placeholder;

        const answer = await showInputPrompt(placeholder, lastValue[placeholder] || matchInput.groups.value);

        if (answer) {
          lastValue[placeholder] = answer;
          result = result.replace(searchValue, `${answer}`);
        } else if (context.cancelVariableReplacer) {
          context.cancelVariableReplacer();
        }
      }
    }
    return result;
  };
}