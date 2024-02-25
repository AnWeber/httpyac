import { DOMImplementation } from '@xmldom/xmldom';
import { EOL } from 'os';
import { basename, dirname } from 'path';
import { formatXml } from 'xmldom-format';
import { TestResult } from '../../models';
import * as utils from '../../utils';
import { SendJsonOutput, SendOutputRequest, createTestSummary } from './jsonOutput';

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
  root.setAttribute('name', `httpyac`);
  root.setAttribute('tests', `${output.summary.totalTests}`);
  root.setAttribute('errors', '0');
  root.setAttribute('disabled', `${output.summary.disabledRequests}`);
  root.setAttribute('failures', `${output.summary.failedTests}`);
  root.setAttribute('time', `${toFloatSeconds(output.requests.reduce(sumDuration, 0))}`);

  for (const [filename, requests] of Object.entries(groupedRequests)) {
    root.appendChild(transformHttpFile(document, filename, requests));
  }

  return formatXml(document, {
    indentation: '  ',
    eol: EOL,
  });
}

// eslint-disable-next-line no-undef
function transformHttpFile(document: XMLDocument, file: string, requests: Array<SendOutputRequest>) {
  const summary = createTestSummary(requests);

  const root = document.createElement('testsuite');
  setAttribute(root, 'name', basename(file));
  setAttribute(root, 'tests', summary.totalTests);
  setAttribute(root, 'failures', summary.failedTests);
  setAttribute(root, 'skipped', summary.disabledRequests);
  setAttribute(root, 'package', dirname(file).replace(process.cwd(), ''));
  setAttribute(root, 'time', toFloatSeconds(requests.reduce(sumDuration, 0)));
  let filePathRelativeToCwd = file.replace(process.cwd(), '');
  filePathRelativeToCwd = filePathRelativeToCwd.startsWith('/')
    ? filePathRelativeToCwd.slice(1)
    : filePathRelativeToCwd;
  setAttribute(root, 'file', filePathRelativeToCwd);

  for (const request of requests) {
    root.appendChild(transformRequest(document, request));
  }
  return root;
}

// eslint-disable-next-line no-undef
function transformRequest(document: XMLDocument, request: SendOutputRequest) {
  const testSuiteNode = document.createElement('testsuite');
  setAttribute(testSuiteNode, 'name', request.name);
  setAttribute(testSuiteNode, 'tests', request.disabled ? 1 : request.summary?.totalTests || 0);
  setAttribute(testSuiteNode, 'failures', request.summary?.failedTests || 0);
  setAttribute(testSuiteNode, 'skipped', request.disabled ? 1 : 0);
  let fileRelativeToCwd = request.fileName.replace(process.cwd(), '');
  fileRelativeToCwd = fileRelativeToCwd.startsWith('/') ? fileRelativeToCwd.slice(1) : fileRelativeToCwd;
  setAttribute(testSuiteNode, 'file', fileRelativeToCwd);
  setAttribute(testSuiteNode, 'package', basename(request.fileName));
  const requestDurationMillis = request.duration || 0;
  setAttribute(testSuiteNode, 'time', toFloatSeconds(requestDurationMillis));

  const propertiesNode = transformToProperties(document, {
    title: request.title,
    description: request.description,
    line: request.line,
    timestamp: request.timestamp,
  });
  if (propertiesNode) {
    testSuiteNode.appendChild(propertiesNode);
  }

  if (request.testResults) {
    const testCaseDurationMillis =
      requestDurationMillis / (request.testResults.length === 0 ? 1 : request.testResults.length);
    for (const testResult of request.testResults) {
      const child = transformTestResultToTestcase(document, testResult, {
        classname: request.name,
        time: toFloatSeconds(testCaseDurationMillis),
        file: fileRelativeToCwd,
      });
      testSuiteNode.appendChild(child);
    }
  } else if (request.disabled) {
    const testcaseNode = document.createElement('testcase');
    testcaseNode.setAttribute('name', 'skipped all tests');
    testcaseNode.setAttribute('classname', request.name);
    testcaseNode.setAttribute('time', '0.000');
    testcaseNode.setAttribute('file', fileRelativeToCwd);
    testSuiteNode.appendChild(testcaseNode);
    testcaseNode.appendChild(document.createElement('skipped'));
  }

  return testSuiteNode;
}
function transformTestResultToTestcase(
  // eslint-disable-next-line no-undef
  document: XMLDocument,
  testResult: TestResult,
  attributes: Record<string, string | number>
) {
  const root = document.createElement('testcase');
  setAttribute(root, 'name', testResult.message);
  for (const [key, value] of Object.entries(attributes)) {
    setAttribute(root, key, value);
  }
  setAttribute(root, 'assertions', 1);

  const propertiesNode = transformToProperties(document, {
    displayMessage: testResult.error?.displayMessage,
    file: testResult.error?.file,
    line: testResult.error?.line,
    offset: testResult.error?.offset,
    errorType: testResult.error?.errorType,
    message: testResult.error?.message,
  });
  if (propertiesNode) {
    root.appendChild(propertiesNode);
  }

  if (!testResult.result) {
    const failureNode = document.createElement('failure');
    root.appendChild(failureNode);
    setAttribute(failureNode, 'message', testResult.message);
    setAttribute(failureNode, 'type', testResult.error?.errorType ?? 'unknown');
    failureNode.textContent = utils.errorToString(testResult.error?.error) || '';
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
function transformToProperties(document: XMLDocument, properties: Record<string, string | number | undefined>) {
  let hasChild = false;
  const root = document.createElement('properties');
  for (const [key, value] of Object.entries(properties)) {
    if (value) {
      hasChild = true;
      const propertyNode = document.createElement('property');
      propertyNode.setAttribute('name', key);
      propertyNode.setAttribute('value', utils.toString(value) || '');
      root.appendChild(propertyNode);
    }
  }

  if (hasChild) {
    return root;
  }
  return undefined;
}
function sumDuration(x: number, y: SendOutputRequest) {
  return x + (y.duration || 0);
}

function toFloatSeconds(durationMillis: number): string {
  return (durationMillis / 1000).toFixed(3);
}

// eslint-disable-next-line no-undef
function setAttribute(node: HTMLElement, key: string, value: string | number | undefined) {
  if (value || value === 0) {
    node.setAttribute(key, `${value}`);
  }
}
