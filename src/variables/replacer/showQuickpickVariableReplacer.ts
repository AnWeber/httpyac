import { ProcessorContext, VariableReplacer, VariableReplacerType } from '../../models';


export class ShowQuickpickVariableReplacer implements VariableReplacer {
  type = VariableReplacerType.showQuickPick;
  constructor(private readonly showListPrompt: (message: string, values: string[]) => Promise<string | undefined>) { }

  async replace(text: string, _type: string, context: ProcessorContext): Promise<string | undefined> {

    const variableRegex = /\{{2}(.+?)\}{2}/gu;
    let match: RegExpExecArray | null;
    let result: string | undefined = text;
    while ((match = variableRegex.exec(text)) !== null) {
      const [searchValue, variable] = match;

      const matchInput = /^\$pick\s*(?<placeholder>[^$]*)(\$value:\s*(?<value>.*))\s*$/u.exec(variable);
      if (matchInput?.groups?.placeholder && matchInput?.groups?.value) {

        const placeholder = matchInput.groups.placeholder;
        const value = matchInput.groups.value;

        const answer = await this.showListPrompt(placeholder, value.split(','));


        if (answer && result) {
          result = result.replace(searchValue, `${answer}`);
        } else if (context.cancelVariableReplacer) {
          context.cancelVariableReplacer();
          result = undefined;
        }
      }
    }
    return result;
  }
}
