import { log } from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import { isNode, parseFromString } from './nodeUtils';
import { SelectedValue, select } from 'xpath';

export async function provideAssertValueXPath(type: string, value: string | undefined, response: models.HttpResponse) {
  if (type === 'xpath' && value && response.body) {
    const body = utils.toString(response.body);
    if (!body) {
      return false;
    }
    try {
      const node = parseFromString(body);
      const results = select(value, node);
      if (results.length === 1) {
        const resultNode = results[0];
        return getTextContent(resultNode);
      }
      return results.map(obj => getTextContent(obj));
    } catch (err) {
      log.warn(`xpath ${value} throws error`, err);
    }
  }
  return false;
}

function getTextContent(resultNode: SelectedValue) {
  if (isNode(resultNode)) {
    return resultNode.textContent;
  }
  return resultNode;
}
