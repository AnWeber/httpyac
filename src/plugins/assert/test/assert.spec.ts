import { TestResultStatus } from '../../../models';
import { initFileProvider, initHttpClientProvider, parseHttp, sendHttpFile } from '../../../test/testUtils';

describe('assert', () => {
  it('should fail on empty type', async () => {
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

    ?? response.parsedBody == {"foo": "bar"}
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.FAILED);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('response.parsedBody == {"foo": "bar"}');
  });
  it('should fail on invalid type', async () => {
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

    ?? notvalid response.parsedBody == {"foo": "bar"}
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.FAILED);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('response.parsedBody == {"foo": "bar"}');
  });
  it('should ignore test on invalid predicate', async () => {
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

    ?? js response.parsedBody =!= {"foo": "bar"}
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(0);
  });
});
