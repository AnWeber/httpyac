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
    expect(httpFile.httpRegions[0].testResults?.[0].result).toBeTruthy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('response.parsedBody == {"foo": "bar"}');
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
    expect(httpFile.httpRegions[0].testResults?.[0].result).toBeFalsy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('response2.parsedBody == {"foo": "bar"}');
  });
});
