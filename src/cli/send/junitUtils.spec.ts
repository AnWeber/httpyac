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
          disabled: false,
          name: 'test',
          duration: 1001,
          summary: {
            totalTests: 1,
            successTests: 1,
            failedTests: 0,
          },
          testResults: [
            {
              result: true,
              message: 'status == 200',
            },
          ],
        },
      ],
      summary: {
        totalRequests: 1,
        successRequests: 1,
        disabledRequests: 0,
        failedRequests: 0,
        totalTests: 1,
        successTests: 1,
        failedTests: 0,
      },
    });
    expect(result).toBe(
      `
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="httpyac" tests="1" errors="0" disabled="0" failures="0" time="1.001">
  <testsuite name="test.http" tests="1" failures="0" skipped="0" package="." time="1.001" file="test.http">
    <testsuite name="test" tests="1" failures="0" skipped="0" file="test.http" package="test.http" time="1.001">
      <testcase name="status == 200" classname="test" time="1.001" file="test.http" assertions="1"/>
    </testsuite>
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
          disabled: false,
          name: 'test',
          duration: 1001,
          summary: {
            totalTests: 1,
            successTests: 1,
            failedTests: 0,
          },
          testResults: [
            {
              result: true,
              message: 'status == 200',
            },
          ],
        },
        {
          fileName: 'test.http',
          disabled: false,
          name: 'test2',
          duration: 1002,
          summary: {
            totalTests: 1,
            successTests: 1,
            failedTests: 0,
          },
          testResults: [
            {
              result: true,
              message: 'status == 200',
            },
          ],
        },
        {
          fileName: 'test2.http',
          disabled: false,
          name: 'other',
          duration: 1002,
          summary: {
            totalTests: 1,
            successTests: 1,
            failedTests: 0,
          },
          testResults: [
            {
              result: true,
              message: 'status == 200',
            },
          ],
        },
      ],
      summary: {
        totalRequests: 3,
        successRequests: 3,
        disabledRequests: 0,
        failedRequests: 0,
        totalTests: 3,
        successTests: 3,
        failedTests: 0,
      },
    });
    expect(result).toBe(
      `
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="httpyac" tests="3" errors="0" disabled="0" failures="0" time="3.005">
  <testsuite name="test.http" tests="2" failures="0" skipped="0" package="." time="2.003" file="test.http">
    <testsuite name="test" tests="1" failures="0" skipped="0" file="test.http" package="test.http" time="1.001">
      <testcase name="status == 200" classname="test" time="1.001" file="test.http" assertions="1"/>
    </testsuite>
    <testsuite name="test2" tests="1" failures="0" skipped="0" file="test.http" package="test.http" time="1.002">
      <testcase name="status == 200" classname="test2" time="1.002" file="test.http" assertions="1"/>
    </testsuite>
  </testsuite>
  <testsuite name="test2.http" tests="1" failures="0" skipped="0" package="." time="1.002" file="test2.http">
    <testsuite name="other" tests="1" failures="0" skipped="0" file="test2.http" package="test2.http" time="1.002">
      <testcase name="status == 200" classname="other" time="1.002" file="test2.http" assertions="1"/>
    </testsuite>
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
          disabled: true,
          name: 'test',
          summary: {
            totalTests: 1,
            successTests: 0,
            failedTests: 0,
          },
        },
      ],
      summary: {
        totalRequests: 1,
        successRequests: 0,
        disabledRequests: 1,
        failedRequests: 0,
        totalTests: 1,
        successTests: 0,
        failedTests: 0,
      },
    });
    expect(result).toBe(
      `
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="httpyac" tests="1" errors="0" disabled="1" failures="0" time="0.000">
  <testsuite name="test.http" tests="1" failures="0" skipped="1" package="." time="0.000" file="test.http">
    <testsuite name="test" tests="1" failures="0" skipped="1" file="test.http" package="test.http" time="0.000">
      <testcase name="skipped all tests" classname="test" time="0.000" file="test.http">
        <skipped/>
      </testcase>
    </testsuite>
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
          disabled: false,
          name: 'test',
          summary: {
            totalTests: 2,
            successTests: 1,
            failedTests: 1,
          },
          testResults: [
            {
              result: false,
              message: 'Assertions fail',
              error: {
                displayMessage: 'failed result',
                error: { message: 'test', name: 'unknown', stack: '' } as unknown as Error,
              },
            },
            {
              result: true,
              message: 'status === 200',
            },
          ],
        },
      ],
      summary: {
        totalRequests: 1,
        successRequests: 0,
        disabledRequests: 0,
        failedRequests: 1,
        totalTests: 2,
        successTests: 1,
        failedTests: 1,
      },
    });
    expect(result).toBe(
      `
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="httpyac" tests="2" errors="0" disabled="0" failures="1" time="0.000">
  <testsuite name="test.http" tests="2" failures="1" skipped="0" package="." time="0.000" file="test.http">
    <testsuite name="test" tests="2" failures="1" skipped="0" file="test.http" package="test.http" time="0.000">
      <testcase name="Assertions fail" classname="test" time="0.000" file="test.http" assertions="1">
        <properties>
          <property name="displayMessage" value="failed result"/>
        </properties>
        <failure message="Assertions fail" type="unknown">{"message":"test","name":"unknown","stack":""}</failure>
      </testcase>
      <testcase name="status === 200" classname="test" time="0.000" file="test.http" assertions="1"/>
    </testsuite>
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
          disabled: false,
          title: 'title',
          name: 'test',
          duration: 1001,
          summary: {
            totalTests: 1,
            successTests: 1,
            failedTests: 0,
          },
        },
      ],
      summary: {
        totalRequests: 1,
        successRequests: 1,
        disabledRequests: 0,
        failedRequests: 0,
        totalTests: 1,
        successTests: 1,
        failedTests: 0,
      },
    });
    expect(result).toBe(
      `
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="httpyac" tests="1" errors="0" disabled="0" failures="0" time="1.001">
  <testsuite name="test.http" tests="1" failures="0" skipped="0" package="." time="1.001" file="test.http">
    <testsuite name="test" tests="1" failures="0" skipped="0" file="test.http" package="test.http" time="1.001">
      <properties>
        <property name="title" value="title"/>
      </properties>
    </testsuite>
  </testsuite>
</testsuites>
    `.trim()
    );
  });
});
