/* eslint-disable no-undef */
import { Variables } from '../../models';
import * as utils from '../../utils';
import { DOMParser } from '@xmldom/xmldom';

export function getNode(variableName: string | undefined, variables: Variables) {
  let xml: string | undefined;
  if (variableName) {
    const variable = variables[variableName];
    if (utils.isString(variable)) {
      xml = variable;
    } else if (utils.isHttpResponse(variable) && utils.isString(variable.body)) {
      xml = variable.body;
    } else if (isNode(variable)) {
      return variable;
    }
  } else if (variables.response && utils.isHttpResponse(variables.response)) {
    const response = variables.response;
    if (utils.isString(response.body) && utils.isMimeTypeXml(response.contentType)) {
      xml = response.body;
    }
  }
  if (xml) {
    return new DOMParser().parseFromString(xml);
  }
  return undefined;
}

export function isNode(obj: unknown): obj is Node {
  const node = obj as Node;
  return (
    node && utils.isString(node.nodeName) && Number.isInteger(node.nodeType) && typeof node.cloneNode === 'function'
  );
}
