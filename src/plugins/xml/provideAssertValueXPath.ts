import { select, SelectedValue, SelectReturnType, useNamespaces } from 'xpath';

import { log } from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import { isNode, parseFromString } from './nodeUtils';
import { XPathProcessorContext } from './xpathProcessorContext';

export async function provideAssertValueXPath(
  type: string,
  value: string | undefined,
  response: models.HttpResponse,
  context: XPathProcessorContext
) {
  if (type === 'xpath' && value && response.body) {
    const body = utils.toString(response.body);
    if (!body) {
      return '';
    }
    try {
      const node = parseFromString(body);
      if (!node) {
        return value;
      }

      let evaluate = select;
      if (context.options.xpath_namespaces) {
        evaluate = useNamespaces(context.options.xpath_namespaces);
      }

      // @ts-expect-error 2345
      const results = evaluate(value, node);
      return getSelectReturnType(results);
    } catch (err) {
      log.warn(`xpath ${value} throws error`, err);
      return value;
    }
  }
  return false;
}

export function getSelectReturnType(results: SelectReturnType) {
  if (results !== null) {
    if (Array.isArray(results)) {
      if (results.length === 0) {
        return undefined;
      }
      if (results.length === 1) {
        const resultNode = results[0];
        return getTextContent(resultNode);
      }
      return results.map(obj => getTextContent(obj));
    }
  }
  return getTextContent(results);
}

function getTextContent(resultNode: SelectedValue) {
  if (isNode(resultNode)) {
    return resultNode.textContent;
  }
  return resultNode;
}
