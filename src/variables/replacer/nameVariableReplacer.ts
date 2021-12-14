import { ProcessorContext, VariableType } from '../../models';
import { ParserRegex } from '../../parser';
import * as utils from '../../utils';

export async function replaceVariableNames(
  text: unknown,
  _type: VariableType | string,
  context: ProcessorContext
): Promise<unknown> {
  if (!utils.isString(text)) {
    return text;
  }
  let match: RegExpExecArray | null;
  let start;
  let result = text;
  while (start !== result) {
    start = result;
    while ((match = ParserRegex.javascript.scriptSingleLine.exec(start)) !== null) {
      const [searchValue, jsVariable] = match;
      const value = utils.toString(context.variables[jsVariable]);
      if (value) {
        result = result.replace(searchValue, value);
      }
    }
  }
  return result;
}
