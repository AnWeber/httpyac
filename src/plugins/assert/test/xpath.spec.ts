import { TestResultStatus } from '../../../models';
import { initFileProvider, initHttpClientProvider, parseHttp, sendHttpFile } from '../../../test/testUtils';

describe('assert.xpath', () => {
  it('should equal xpath', async () => {
    initFileProvider();

    initHttpClientProvider(() =>
      Promise.resolve({
        body: `<bookstore><book><title>Everyday Italian</title></book></bookstore>`,
      })
    );
    const httpFile = await parseHttp(`
    GET /get

    ?? xpath /bookstore/book/title == Everyday Italian
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.SUCCESS);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('/bookstore/book/title == Everyday Italian');
  });
  it('should equal xpath with namespaces', async () => {
    initFileProvider();
    initHttpClientProvider(() =>
      Promise.resolve({
        body: `<book xmlns:bookml='http://example.com/book'><bookml:title>Harry Potter</bookml:title></book>`,
      })
    );

    const httpFile = await parseHttp(`
    @xpath_ns bookml=http://example.com/book
    GET /get

    ?? xpath //bookml:title/text() == Harry Potter
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.SUCCESS);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('//bookml:title/text() == Harry Potter');
  });
  it('should fail xpath', async () => {
    initFileProvider();
    initHttpClientProvider(() =>
      Promise.resolve({
        body: `<bookstore><book><title>Everyday Italian</title></book></bookstore>`,
      })
    );
    const httpFile = await parseHttp(`
    GET /get

    ?? xpath /bookstore/book/title == Everyday Italian2
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.FAILED);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('/bookstore/book/title == Everyday Italian2');
  });
  it('should fail on empty body', async () => {
    initFileProvider();
    initHttpClientProvider();

    const httpFile = await parseHttp(`
    GET /get

    ?? xpath /bookstore/book/title == Everyday Italian2
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.FAILED);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('/bookstore/book/title == Everyday Italian2');
  });
});
