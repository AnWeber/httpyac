import { log } from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import { isNode, parseFromString } from './nodeUtils';
import { SelectReturnType, SelectedValue, select } from 'xpath';

export async function provideAssertValueXPath(type: string, value: string | undefined, response: models.HttpResponse) {
  if (type === 'xpath' && value && response.body) {
    const body = utils.toString(response.body);
    if (!body) {
      return '';
    }
    try {
      const node = parseFromString(body);
      const results = select(value, node);
      return getSelectReturnType(results);
    } catch (err) {
      log.warn(`xpath ${value} throws error`, err);
    }
  }
  return false;
}

export function getSelectReturnType(results: SelectReturnType) {
  if (results !== null) {
    if (Array.isArray(results)) {
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
