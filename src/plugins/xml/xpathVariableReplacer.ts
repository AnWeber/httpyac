import { log } from '../../io';
import { ProcessorContext, VariableType } from '../../models';
import * as utils from '../../utils';
import { getNode, isNode } from './nodeUtils';
import { select } from 'xpath';

export async function xpathVariableReplacer(
  text: unknown,
  _type: VariableType | string,
  { variables, scriptConsole }: ProcessorContext
): Promise<unknown> {
  return utils.parseHandlebarsString(text, async (variable: string) => {
    const match = /^\s*\$xpath(:(?<variable>[^\s]*))?\s*(?<xpath>.*)\s*$/iu.exec(variable);
    if (match?.groups?.xpath) {
      try {
        const node = getNode(match.groups.variable, variables);
        if (node) {
          const results = select(match.groups.xpath, node);
          if (results.length === 1) {
            const resultNode = results[0];
            if (isNode(resultNode)) {
              return resultNode.nodeValue;
            }
            return resultNode;
          }
        }
      } catch (err) {
        (scriptConsole || log).warn(`xpath ${match.groups.xpath} throws error`, err);
      }
      return '';
    }
    return undefined;
  });
}
