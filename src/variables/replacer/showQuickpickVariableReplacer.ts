import { ProcessorContext, VariableReplacer } from '../../models';

export function showQuickpickVariableReplacerFactory(showListPrompt: (message: string, values: string[]) => Promise<string | undefined>): VariableReplacer {
  return async function showQuickpickVariableReplacer(text: string, _type: string, context: ProcessorContext) {

    const variableRegex = /\{{2}(.+?)\}{2}/g;
    let match: RegExpExecArray | null;
    let result: string | undefined = text;
    while ((match = variableRegex.exec(text)) !== null) {
      const [searchValue, variable] = match;

      const matchInput = /^\$pick\s*(?<placeholder>[^$]*)(\$value:\s*(?<value>.*))\s*$/.exec(variable);
      if (matchInput?.groups?.placeholder && matchInput?.groups?.value) {

        const placeholder = matchInput.groups.placeholder;
        const value = matchInput.groups.value;

        const answer = await showListPrompt(placeholder, value.split(','));


        if (answer && result) {
          result = result.replace(searchValue, `${answer}`);
        } else if (context.cancelVariableReplacer) {
          context.cancelVariableReplacer();
          result = undefined;
        }
      }
    }
    return result;
  };
}