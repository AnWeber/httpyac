import { SendJsonOutput } from './jsonOutput';

const xmlSpecialCharReplacementMap: Record<string, string> = {
  '<': 'lt',
  '>': 'gt',
  '&': 'amp',
  "'": 'apos',
  '"': 'quot',
};

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/gu, c => `&${xmlSpecialCharReplacementMap[c]};`);
}

function prettyPrintXml(xml: string, tab = '\t', nl = '\n'): string {
  let formatted = '';
  let indent = '';
  const nodes = xml.slice(1, -1).split(/>\s*</u);
  if (nodes[0][0] === '?') {
    formatted += `<${nodes.shift()}>${nl}`;
  }
  for (const node of nodes) {
    if (node.startsWith('/')) {
      indent = indent.slice(tab.length); // decrease indent
    }
    formatted += `${indent}<${node}>${nl}`;
    if (!node.startsWith('/') && !node.endsWith('/') && node.indexOf('</') === -1) {
      indent += tab; // increase indent
    }
  }
  return formatted;
}

function toFloatSeconds(durationMillis: number): string {
  return (durationMillis / 1000).toFixed(3);
}

export function toJunitXml(output: SendJsonOutput): string {
  let resultXml = `<?xml version="1.0" encoding="UTF-8"?><testsuites errors="0" failures="${
    output.summary.failedTests
  }" tests="${output.summary.totalTests}" time="${toFloatSeconds(
    output.requests.reduce((n, r) => n + (r.duration ?? 0), 0)
  )}">`;
  for (const req of output.requests) {
    resultXml += '<properties>';
    if (req.name) {
      resultXml += `<property name="name" value="${escapeXml(req.name)}"/>`;
    }
    if (req.title) {
      resultXml += `<property name="title" value="${escapeXml(req.title)}"/>`;
    }
    resultXml += `<property name="line" value="${req.line}"/>`;
    resultXml += '</properties>';
    const regionRef = req.name ?? req.title ?? req.fileName;
    resultXml += `<testsuite name="${escapeXml(regionRef)}" tests="${req.summary.totalTests}" errors="0" failures="${
      req.summary.failedTests
    }" package="${escapeXml(req.fileName)}" time="${toFloatSeconds(req.duration ?? 0)}">`;
    for (const testResult of req.testResults ?? []) {
      resultXml += `<testcase name="${escapeXml(testResult.message)}" classname="${escapeXml(regionRef)}"`;
      if (!testResult.result && testResult.error) {
        resultXml += '>';
        resultXml += `<failure message="${escapeXml(testResult.error.message ?? '')}" type="${escapeXml(
          testResult.error.errorType ?? 'unknown'
        )}">`;
        resultXml += escapeXml(testResult.error.displayMessage);
        resultXml += `</failure>`;
        resultXml += `</testcase>`;
      } else {
        resultXml += '/>';
      }
    }
    resultXml += `</testsuite>`;
  }
  resultXml += `</testsuites>`;
  return prettyPrintXml(resultXml);
}
