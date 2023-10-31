import { SendJsonOutput, SendOutputRequest, createTestSummary } from './jsonOutput';
import * as utils from '../../utils';
import { basename, dirname } from 'path';
import { EOL } from 'os';
import { DOMImplementation } from '@xmldom/xmldom';
import { formatXml } from 'xmldom-format';

function toFloatSeconds(durationMillis: number): string {
  return (durationMillis / 1000).toFixed(3);
}

/**
 * output in junit format
 * @param output json object with all test results
 * @returns xml in junit format (https://llg.cubic.org/docs/junit/)
 */
export function transformToJunit(output: SendJsonOutput): string {
  const groupedRequests = groupByFilename(output.requests);

  const dom = new DOMImplementation();
  const document = dom.createDocument('', '');

  const xmlNode = document.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"');
  document.appendChild(xmlNode);
  const root = document.createElement('testsuites');
  document.appendChild(root);
  root.setAttribute('errors', '0');
  root.setAttribute('disabled', `${output.summary.disabledRequests}`);
  root.setAttribute('failues', `${output.summary.failedTests}`);

  for (const [filename, requests] of Object.entries(groupedRequests)) {
    root.appendChild(transformToTestSuite(document, filename, requests));
  }

  return formatXml(document, {
    indentation: '  ',
    eol: EOL,
  });
}

function sum(x: number, y: SendOutputRequest) {
  return x + (y.duration || 0);
}

// eslint-disable-next-line no-undef
function transformToTestSuite(document: XMLDocument, file: string, requests: Array<SendOutputRequest>) {
  const summary = createTestSummary(requests);

  const root = document.createElement('testsuite');
  setAttribute(root, 'name', basename(file));
  setAttribute(root, 'tests', summary.totalRequests);
  setAttribute(root, 'failures', summary.failedRequests);
  setAttribute(root, 'skipped', summary.disabledRequests);
  setAttribute(root, 'package', dirname(file).replace(process.cwd(), ''));
  setAttribute(root, 'time', toFloatSeconds(requests.reduce(sum, 0) || 0));
  setAttribute(root, 'file', file);

  for (const request of requests) {
    root.appendChild(transformToProperties(document, request));
    root.appendChild(transformToTestcase(document, request));
  }
  return root;
}

// eslint-disable-next-line no-undef
function transformToTestcase(document: XMLDocument, request: SendOutputRequest) {
  const root = document.createElement('testcase');
  setAttribute(root, 'name', request.name);
  setAttribute(root, 'classname', basename(request.fileName));
  setAttribute(root, 'assertions', request.summary.totalTests);
  setAttribute(root, 'time', toFloatSeconds(request.duration || 0));

  if (request.disabled) {
    root.appendChild(document.createElement('skipped'));
  }
  if (request.testResults) {
    for (const testResult of request.testResults) {
      if (!testResult.result) {
        const failureNode = document.createElement('failure');
        root.appendChild(failureNode);
        setAttribute(failureNode, 'message', testResult.message);
        setAttribute(failureNode, 'type', testResult.error?.errorType ?? 'unknown');
        if (testResult.error) {
          failureNode.textContent = testResult.error?.displayMessage;
          const systemErrNode = document.createElement('system-err');
          systemErrNode.textContent = utils.errorToString(testResult.error.error) || '';
          root.appendChild(systemErrNode);
        }
      }
    }
  }

  return root;
}

function groupByFilename(requests: Array<SendOutputRequest>): Record<string, Array<SendOutputRequest>> {
  const result: Record<string, Array<SendOutputRequest>> = {};
  for (const request of requests) {
    if (!result[request.fileName]) {
      result[request.fileName] = [];
    }
    result[request.fileName].push(request);
  }
  return result;
}

// eslint-disable-next-line no-undef
function transformToProperties(document: XMLDocument, request: SendOutputRequest) {
  const properties = {
    name: request.name,
    title: request.title,
    description: request.description,
    line: request.line,
    start: request.timestamp,
  };
  const root = document.createElement('properties');
  for (const [key, value] of Object.entries(properties)) {
    if (value) {
      const propertyNode = document.createElement('property');
      propertyNode.setAttribute('name', key);
      propertyNode.setAttribute('value', utils.toString(value) || '');
      root.appendChild(propertyNode);
    }
  }

  return root;
}

// eslint-disable-next-line no-undef
function setAttribute(node: HTMLElement, key: string, value: string | number | undefined) {
  if (value || value === 0) {
    node.setAttribute(key, `${value}`);
  }
}
