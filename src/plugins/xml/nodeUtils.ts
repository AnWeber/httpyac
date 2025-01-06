import { DOMParser, Document, Node } from '@xmldom/xmldom';

import { log } from '../../io';
import { Variables } from '../../models';
import * as utils from '../../utils';

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
    return parseFromString(xml);
  }
  return undefined;
}

export function isNode(obj: unknown): obj is Node {
  const node = obj as Node;
  return (
    node && utils.isString(node.nodeName) && Number.isInteger(node.nodeType) && typeof node.cloneNode === 'function'
  );
}

export function parseFromString(xml: string, mimeType?: string | undefined): Document | undefined {
  try {
    return new DOMParser({
      errorHandler(level: string, message: unknown) {
        log.debug(level, message);
      },
    }).parseFromString(xml, mimeType || 'text/xml');
  } catch (err) {
    log.warn('xml format error', xml, err);
    return undefined;
  }
}
