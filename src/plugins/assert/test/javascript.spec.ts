import { TestResultStatus } from '../../../models';
import { initFileProvider, initHttpClientProvider, parseHttp, sendHttpFile } from '../../../test/testUtils';

describe('assert.javascript', () => {
  it('should equal body', async () => {
    initFileProvider();

    initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: {
          foo: 'bar',
        },
      })
    );
    const httpFile = await parseHttp(`
    GET /get

    ?? js response.parsedBody == {"foo": "bar"}
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.SUCCESS);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('response.parsedBody == {"foo": "bar"}');
  });

  it('should allow check for integer', async () => {
    initFileProvider();

    initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: {
          foo: 1,
        },
      })
    );
    const httpFile = await parseHttp(`
    GET /get

    ?? js response.parsedBody.foo == 1
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.SUCCESS);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('response.parsedBody.foo == 1');
  });
  it('should allow check for float', async () => {
    initFileProvider();

    initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: {
          foo: 1.2,
        },
      })
    );
    const httpFile = await parseHttp(`
    GET /get

    ?? js response.parsedBody.foo == 1.2
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.SUCCESS);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('response.parsedBody.foo == 1.2');
  });

  it('should not fail on exception in javascript', async () => {
    initFileProvider();
    initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: {
          foo: 'bar',
        },
      })
    );

    const httpFile = await parseHttp(`
    GET /get

    ?? js response2.parsedBody == {"foo": "bar"}
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.FAILED);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('response2.parsedBody == {"foo": "bar"}');
  });
});
