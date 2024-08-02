import { TestResultStatus } from '../../../models';
import { initFileProvider, initHttpClientProvider, parseHttp, sendHttpFile } from '../../../test/testUtils';

describe('assert.header', () => {
  it('should equal header', async () => {
    initFileProvider();

    initHttpClientProvider(() =>
      Promise.resolve({
        headers: {
          foo: 'bar',
        },
      })
    );
    const httpFile = await parseHttp(`
    GET /get

    ?? header foo == bar
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.SUCCESS);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('foo == bar');
  });
});
