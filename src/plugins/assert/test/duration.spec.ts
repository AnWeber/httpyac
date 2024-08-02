import { TestResultStatus } from '../../../models';
import { initFileProvider, initHttpClientProvider, parseHttp, sendHttpFile } from '../../../test/testUtils';

describe('assert.duration', () => {
  it('should be faster then 2000', async () => {
    initFileProvider();

    initHttpClientProvider(() =>
      Promise.resolve({
        timings: {
          total: 100,
        },
      })
    );
    const httpFile = await parseHttp(
      `
    GET /get

    ?? duration < 2000
    `
    );

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.SUCCESS);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('duration < 2000');
  });
});
