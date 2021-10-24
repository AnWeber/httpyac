import { ProcessorContext, VariableType } from '../../models';
import { ParserRegex } from '../../parser';
import * as utils from '../../utils';
import { log } from '../../io';


export async function javascriptVariableReplacer(text: unknown, type: VariableType | string, context: ProcessorContext): Promise<unknown> {
  if (!utils.isString(text)) {
    return text;
  }
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = ParserRegex.javascript.scriptSingleLine.exec(text)) !== null) {
    const [searchValue, jsVariable] = match;

    try {
      const value = await utils.evalExpression(jsVariable, context);
      if (utils.isString(value) || typeof value === 'number') {
        result = result.replace(searchValue, `${value}`);
      } else if (value instanceof Date) {
        result = result.replace(searchValue, `${value.toISOString()}`);
      } else if (value) {
        result = result.replace(searchValue, `${value}`);
      }
    } catch (err) {
      if (type === VariableType.variable) {
        log.warn(`variable ${jsVariable} not defined`);
      } else {
        throw err;
      }
    }
  }
  return result;
}
