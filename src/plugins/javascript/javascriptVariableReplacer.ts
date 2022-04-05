import { log } from '../../io';
import { ProcessorContext, VariableType } from '../../models';
import * as utils from '../../utils';
import { evalExpression } from './moduleUtils';

export async function replaceJavascriptExpressions(
  text: unknown,
  type: VariableType | string,
  context: ProcessorContext
): Promise<unknown> {
  return await utils.parseHandlebarsString(text, async (variable: string, searchValue: string) => {
    try {
      return await evalExpression(variable, context);
    } catch (err) {
      if (type === VariableType.variable) {
        log.trace(`variable ${variable} not defined`);
        log.trace(err);
      } else {
        log.error(`expression ${variable} throws error`);
        throw err;
      }
      return searchValue;
    }
  });
}
