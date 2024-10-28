import { select, useNamespaces } from 'xpath';

import { log } from '../../io';
import { VariableType } from '../../models';
import * as utils from '../../utils';
import { getNode } from './nodeUtils';
import { getSelectReturnType } from './provideAssertValueXPath';
import { XPathProcessorContext } from './xpathProcessorContext';

export async function xpathVariableReplacer(
  text: unknown,
  _type: VariableType | string,
  { variables, scriptConsole, options }: XPathProcessorContext
): Promise<unknown> {
  return utils.parseHandlebarsString(text, async (variable: string) => {
    const match = /^\s*\$xpath(:(?<variable>[^\s]*))?\s*(?<xpath>.*)\s*$/iu.exec(variable);
    if (match?.groups?.xpath) {
      try {
        const node = getNode(match.groups.variable, variables);
        if (node) {
          let evaluate = select;
          if (options.xpath_namespaces) {
            evaluate = useNamespaces(options.xpath_namespaces);
          }
          // @ts-expect-error 2345
          const results = evaluate(match.groups.xpath, node);
          return getSelectReturnType(results);
        }
      } catch (err) {
        (scriptConsole || log).warn(`xpath ${match.groups.xpath} throws error`, err);
      }
      return '';
    }
    return undefined;
  });
}
