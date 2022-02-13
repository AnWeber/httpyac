import { log } from '../../io';
import { ProcessorContext, VariableType } from '../../models';
import * as utils from '../../utils';

export async function replaceJavascriptExpressions(
  text: unknown,
  type: VariableType | string,
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
    while ((match = utils.HandlebarsSingleLine.exec(start)) !== null) {
      const [searchValue, jsVariable] = match;

      try {
        const value = utils.toString(await utils.evalExpression(jsVariable, context));

        if (value) {
          result = result.replace(searchValue, value);
        }
      } catch (err) {
        if (type === VariableType.variable) {
          log.trace(`variable ${jsVariable} not defined`);
          log.trace(err);
        } else {
          log.warn(`expression ${jsVariable} throws error`);
          log.warn(err);
        }
      }
    }
  }
  return result;
}
