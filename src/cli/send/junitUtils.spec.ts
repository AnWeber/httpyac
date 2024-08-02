import { TestResultStatus } from '../../models';
import { transformToJunit } from './junitUtils';

describe('transformToJunit', () => {
  it('should output valid request', () => {
    const result = transformToJunit({
      _meta: {
        version: 'test',
      },
      requests: [
        {
          fileName: 'test.http',
          name: 'test',
          duration: 1001,
          summary: {
            totalTests: 1,
            successTests: 1,
            failedTests: 0,
            erroredTests: 0,
            skippedTests: 0,
          },
          testResults: [
            {
              status: TestResultStatus.SUCCESS,
              message: 'status == 200',
            },
          ],
        },
      ],
      summary: {
        totalRequests: 1,
        successRequests: 1,
        skippedRequests: 0,
        erroredRequests: 0,
        failedRequests: 0,
        totalTests: 1,
        successTests: 1,
        failedTests: 0,
        erroredTests: 0,
        skippedTests: 0,
      },
    });
    expect(result).toBe(
      `
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="httpyac" tests="1" errors="0" disabled="0" failures="0" time="1.001">
  <testsuite name="test" tests="1" errors="0" failures="0" skipped="0" package="test.http" time="1.001">
    <properties>
      <property name="file" value="test.http"/>
    </properties>
    <testcase name="status == 200" classname="test" time="1.001" assertions="1"/>
  </testsuite>
</testsuites>
    `.trim()
    );
  });

  it('should output multiple requests', () => {
    const result = transformToJunit({
      _meta: {
        version: 'test',
      },
      requests: [
        {
          fileName: 'test.http',
          name: 'test',
          duration: 1001,
          summary: {
            totalTests: 1,
            successTests: 1,
            failedTests: 0,
            erroredTests: 0,
            skippedTests: 0,
          },
          testResults: [
            {
              status: TestResultStatus.SUCCESS,
              message: 'status == 200',
            },
          ],
        },
        {
          fileName: 'test.http',
          name: 'test2',
          duration: 1002,
          summary: {
            totalTests: 1,
            successTests: 1,
            failedTests: 0,
            erroredTests: 0,
            skippedTests: 0,
          },
          testResults: [
            {
              status: TestResultStatus.SUCCESS,
              message: 'status == 200',
            },
          ],
        },
        {
          fileName: 'test2.http',
          name: 'other',
          duration: 1002,
          summary: {
            totalTests: 1,
            successTests: 1,
            failedTests: 0,
            erroredTests: 0,
            skippedTests: 0,
          },
          testResults: [
            {
              status: TestResultStatus.SUCCESS,
              message: 'status == 200',
            },
          ],
        },
      ],
      summary: {
        totalRequests: 3,
        successRequests: 3,
        skippedRequests: 0,
        erroredRequests: 0,
        failedRequests: 0,
        totalTests: 3,
        successTests: 3,
        failedTests: 0,
        erroredTests: 0,
        skippedTests: 0,
      },
    });
    expect(result).toBe(
      `
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="httpyac" tests="3" errors="0" disabled="0" failures="0" time="3.005">
  <testsuite name="test" tests="1" errors="0" failures="0" skipped="0" package="test.http" time="1.001">
    <properties>
      <property name="file" value="test.http"/>
    </properties>
    <testcase name="status == 200" classname="test" time="1.001" assertions="1"/>
  </testsuite>
  <testsuite name="test2" tests="1" errors="0" failures="0" skipped="0" package="test.http" time="1.002">
    <properties>
      <property name="file" value="test.http"/>
    </properties>
    <testcase name="status == 200" classname="test2" time="1.002" assertions="1"/>
  </testsuite>
  <testsuite name="other" tests="1" errors="0" failures="0" skipped="0" package="test2.http" time="1.002">
    <properties>
      <property name="file" value="test2.http"/>
    </properties>
    <testcase name="status == 200" classname="other" time="1.002" assertions="1"/>
  </testsuite>
</testsuites>
    `.trim()
    );
  });

  it('should output disabled request', () => {
    const result = transformToJunit({
      _meta: {
        version: 'test',
      },
      requests: [
        {
          fileName: 'test.http',
          name: 'test',
          summary: {
            totalTests: 1,
            successTests: 0,
            failedTests: 0,
            erroredTests: 0,
            skippedTests: 1,
          },
          testResults: [
            {
              status: TestResultStatus.SKIPPED,
              message: 'skipped all tests',
            },
          ],
        },
      ],
      summary: {
        totalRequests: 1,
        successRequests: 0,
        skippedRequests: 1,
        erroredRequests: 0,
        failedRequests: 0,
        totalTests: 1,
        successTests: 0,
        failedTests: 0,
        erroredTests: 0,
        skippedTests: 1,
      },
    });
    expect(result).toBe(
      `
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="httpyac" tests="1" errors="0" disabled="1" failures="0" time="0.000">
  <testsuite name="test" tests="1" errors="0" failures="0" skipped="1" package="test.http" time="0.000">
    <properties>
      <property name="file" value="test.http"/>
    </properties>
    <testcase name="skipped all tests" classname="test" time="0.000" assertions="1">
      <skipped/>
    </testcase>
  </testsuite>
</testsuites>
    `.trim()
    );
  });

  it('should output invalid request', () => {
    const result = transformToJunit({
      _meta: {
        version: 'test',
      },
      requests: [
        {
          fileName: 'test.http',
          name: 'test',
          summary: {
            totalTests: 2,
            successTests: 1,
            failedTests: 1,
            erroredTests: 0,
            skippedTests: 0,
          },
          testResults: [
            {
              status: TestResultStatus.FAILED,
              message: 'Assertions fail',
              error: {
                displayMessage: 'failed result',
                error: { message: 'test', name: 'unknown', stack: '' } as unknown as Error,
              },
            },
            {
              status: TestResultStatus.SUCCESS,
              message: 'status === 200',
            },
          ],
        },
      ],
      summary: {
        totalRequests: 1,
        successRequests: 0,
        skippedRequests: 0,
        erroredRequests: 0,
        failedRequests: 1,
        totalTests: 2,
        successTests: 1,
        failedTests: 1,
        erroredTests: 0,
        skippedTests: 0,
      },
    });
    expect(result).toBe(
      `
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="httpyac" tests="2" errors="0" disabled="0" failures="1" time="0.000">
  <testsuite name="test" tests="2" errors="0" failures="1" skipped="0" package="test.http" time="0.000">
    <properties>
      <property name="file" value="test.http"/>
    </properties>
    <testcase name="Assertions fail" classname="test" time="0.000" assertions="1">
      <properties>
        <property name="displayMessage" value="failed result"/>
      </properties>
      <failure message="Assertions fail" type="unknown">{"message":"test","name":"unknown","stack":""}</failure>
    </testcase>
    <testcase name="status === 200" classname="test" time="0.000" assertions="1"/>
  </testsuite>
</testsuites>
    `.trim()
    );
  });

  it('should output properties', () => {
    const result = transformToJunit({
      _meta: {
        version: 'test',
      },
      requests: [
        {
          fileName: 'test.http',
          title: 'title',
          name: 'test',
          duration: 1001,
          summary: {
            totalTests: 1,
            successTests: 1,
            failedTests: 0,
            erroredTests: 0,
            skippedTests: 0,
          },
        },
      ],
      summary: {
        totalRequests: 1,
        successRequests: 1,
        skippedRequests: 0,
        erroredRequests: 0,
        failedRequests: 0,
        totalTests: 1,
        successTests: 1,
        failedTests: 0,
        erroredTests: 0,
        skippedTests: 0,
      },
    });
    expect(result).toBe(
      `
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="httpyac" tests="1" errors="0" disabled="0" failures="0" time="1.001">
  <testsuite name="test" tests="1" errors="0" failures="0" skipped="0" package="test.http" time="1.001">
    <properties>
      <property name="title" value="title"/>
      <property name="file" value="test.http"/>
    </properties>
  </testsuite>
</testsuites>
    `.trim()
    );
  });
});
