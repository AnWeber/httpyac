import { TestResultStatus } from '../../../models';
import { initFileProvider, initHttpClientProvider, parseHttp, sendHttpFile } from '../../../test/testUtils';

describe('assert.status', () => {
  it('should be equal 200', async () => {
    initFileProvider();
    initHttpClientProvider();
    const httpFile = await parseHttp(`
    GET /get

    ?? status == 200
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.SUCCESS);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('status == 200');
  });
  it('should be equal to 200 with global assert', async () => {
    initFileProvider();
    initHttpClientProvider();
    const httpFile = await parseHttp(`
    ?? status == 200
    ###
    GET /get

    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[1].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[1].testResults?.[0].status).toBe(TestResultStatus.SUCCESS);
    expect(httpFile.httpRegions[1].testResults?.[0].message).toBe('status == 200');
  });
  it('should not be equal 200', async () => {
    initFileProvider();
    initHttpClientProvider(() => Promise.resolve({ statusCode: 201 }));
    const httpFile = await parseHttp(`
    GET /get

    ?? status == 200
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(201);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.FAILED);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('status == 200');
  });
  it('should compare valid to 200', async () => {
    initFileProvider();
    initHttpClientProvider();
    const httpFile = await parseHttp(`
    GET /get

    ?? status > 199
    ?? status >= 200
    ?? status < 201
    ?? status <= 200
    ?? status isNumber
    ?? status matches ^\\d+
    ?? status exists
    ?? status endsWith 00
    ?? status startsWith 20
    ?? status != 20
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(10);
    expect(httpFile.httpRegions[0].testResults?.every(obj => obj.status === TestResultStatus.SUCCESS)).toBeTruthy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('status > 199');
    expect(httpFile.httpRegions[0].testResults?.[1].message).toBe('status >= 200');
    expect(httpFile.httpRegions[0].testResults?.[2].message).toBe('status < 201');
    expect(httpFile.httpRegions[0].testResults?.[3].message).toBe('status <= 200');
    expect(httpFile.httpRegions[0].testResults?.[4].message).toBe('status isNumber');
    expect(httpFile.httpRegions[0].testResults?.[5].message).toBe('status matches ^\\d+');
    expect(httpFile.httpRegions[0].testResults?.[6].message).toBe('status exists');
    expect(httpFile.httpRegions[0].testResults?.[7].message).toBe('status endsWith 00');
    expect(httpFile.httpRegions[0].testResults?.[8].message).toBe('status startsWith 20');
    expect(httpFile.httpRegions[0].testResults?.[9].message).toBe('status != 20');
  });
});
