import { SendJsonOutput } from '@/cli/send/jsonOutput';

export function toJunitXml(output: SendJsonOutput): string {
  let resultXml = `
  <?xml version="1.0" encoding="UTF-8"?>
  <testsuites 
    disabled="0"
    errors="${output.requests.flatMap(r => r.testResults).filter(r => r?.error !== undefined).length}"
    failures="${output.summary.failedTests}"
    tests="${output.summary.totalTests}"
    time="0">
`;
  for (const req of output.requests) {
    resultXml += `
    <testsuite
      name="${req.fileName}"
      tests="${req.summary.totalTests}"
      disabled="0"
      errors="${req.testResults?.filter(r => r.error !== undefined).length}"
      failures="${req.summary.failedTests}"
      skipped="0"
      time="0"
      timestamp="">
`;
    for (const testResult of req.testResults ?? []) {
      resultXml += `
      <testcase 
        name="${testResult.message}"
        classname="${req.fileName}"
        time="">
      </testcase>
`;
    }
    resultXml += '</testsuite>';
  }
  resultXml += `
  </testsuites>
`;
  return resultXml;
}
