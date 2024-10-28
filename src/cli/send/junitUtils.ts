import { DOMImplementation, Document, Element } from '@xmldom/xmldom';
import { EOL } from 'os';
import { formatXml } from 'xmldom-format';
import { TestResult, TestResultStatus } from '../../models';
import * as utils from '../../utils';
import { SendJsonOutput, SendOutputRequest } from './jsonOutput';

/**
 * output in junit format
 * @param output json object with all test results
 * @returns xml in junit format (https://github.com/junit-team/junit5/blob/main/platform-tests/src/test/resources/jenkins-junit.xsd)
 */
export function transformToJunit(output: SendJsonOutput): string {
  const dom = new DOMImplementation();
  const document = dom.createDocument('', '');

  const xmlNode = document.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"');
  document.appendChild(xmlNode);
  const root = document.createElement('testsuites');
  document.appendChild(root);
  root.setAttribute('name', `httpyac`);
  root.setAttribute('tests', `${output.summary.totalTests}`);
  root.setAttribute('errors', `${output.summary.erroredTests}`);
  root.setAttribute('disabled', `${output.summary.skippedTests}`);
  root.setAttribute('failures', `${output.summary.failedTests}`);
  root.setAttribute('time', `${toFloatSeconds(output.requests.reduce(sumDuration, 0))}`);

  for (const request of output.requests) {
    root.appendChild(transformRequest(document, request));
  }

  return formatXml(document, {
    indentation: '  ',
    eol: EOL,
  });
}

function transformRequest(document: Document, request: SendOutputRequest) {
  const testSuiteNode = document.createElement('testsuite');
  setAttribute(testSuiteNode, 'name', request.name);
  setAttribute(testSuiteNode, 'tests', request.summary?.totalTests || 0);
  setAttribute(testSuiteNode, 'errors', request.summary?.erroredTests || 0);
  setAttribute(testSuiteNode, 'failures', request.summary?.failedTests || 0);
  setAttribute(testSuiteNode, 'skipped', request.summary?.skippedTests || 0);

  let fileRelativeToCwd = request.fileName.replace(process.cwd(), '');
  fileRelativeToCwd = fileRelativeToCwd.startsWith('/') ? fileRelativeToCwd.slice(1) : fileRelativeToCwd;
  setAttribute(testSuiteNode, 'package', fileRelativeToCwd);
  const requestDurationMillis = request.duration || 0;
  setAttribute(testSuiteNode, 'time', toFloatSeconds(requestDurationMillis));

  const propertiesNode = transformToProperties(document, {
    title: request.title,
    description: request.description,
    line: request.line,
    timestamp: request.timestamp,
    file: fileRelativeToCwd,
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
      });
      testSuiteNode.appendChild(child);
    }
  }

  return testSuiteNode;
}
function transformTestResultToTestcase(
  document: Document,
  testResult: TestResult,
  attributes: Record<string, string | number>
) {
  const root = document.createElement('testcase');
  setAttribute(root, 'name', testResult.message);
  for (const [key, value] of Object.entries(attributes)) {
    setAttribute(root, key, value);
  }
  setAttribute(root, 'assertions', 1);

  if (testResult.error) {
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
  }

  if ([TestResultStatus.ERROR, TestResultStatus.FAILED].includes(testResult.status)) {
    const failureNode = document.createElement('failure');
    root.appendChild(failureNode);
    setAttribute(failureNode, 'message', testResult.message);
    setAttribute(failureNode, 'type', testResult.error?.errorType ?? 'unknown');
    failureNode.textContent = utils.errorToString(testResult.error?.error) || '';
  } else if (testResult.status === TestResultStatus.SKIPPED) {
    root.appendChild(document.createElement('skipped'));
  }

  return root;
}

function transformToProperties(document: Document, properties: Record<string, string | number | undefined>) {
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

function setAttribute(node: Element, key: string, value: string | number | undefined) {
  if (value || value === 0) {
    node.setAttribute(key, `${value}`);
  }
}
