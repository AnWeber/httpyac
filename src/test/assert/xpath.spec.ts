import { sendHttpFile, initFileProvider, parseHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('assert.xpath', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  beforeEach(async () => await localServer.reset());
  afterAll(async () => await localServer.stop());
  it('should equal xpath', async () => {
    initFileProvider();
    await localServer
      .forGet('/get')
      .thenReply(200, `<bookstore><book><title>Everyday Italian</title></book></bookstore>`);
    const httpFile = await parseHttp(`
    GET /get

    ?? xpath /bookstore/book/title == Everyday Italian
    `);

    const responses = await sendHttpFile(httpFile, {
      host: `http://localhost:${localServer.port}`,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].result).toBeTruthy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('/bookstore/book/title == Everyday Italian');
  });
  it.only('should equal xpath with namespaces', async () => {
    initFileProvider();
    await localServer
      .forGet('/get')
      .thenReply(200, `<book xmlns:bookml='http://example.com/book'><bookml:title>Harry Potter</bookml:title></book>`);
    const httpFile = await parseHttp(`
    @xpath_ns bookml=http://example.com/book
    GET /get

    ?? xpath //bookml:title/text() == Harry Potter
    `);

    const responses = await sendHttpFile(httpFile, {
      host: `http://localhost:${localServer.port}`,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].result).toBeTruthy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('//bookml:title/text() == Harry Potter');
  });
  it('should fail xpath', async () => {
    initFileProvider();
    await localServer
      .forGet('/get')
      .thenReply(200, `<bookstore><book><title>Everyday Italian</title></book></bookstore>`);
    const httpFile = await parseHttp(`
    GET /get

    ?? xpath /bookstore/book/title == Everyday Italian2
    `);

    const responses = await sendHttpFile(httpFile, {
      host: `http://localhost:${localServer.port}`,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].result).toBeFalsy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('/bookstore/book/title == Everyday Italian2');
  });
  it('should fail on empty body', async () => {
    initFileProvider();
    await localServer.forGet('/get').thenReply(200);
    const httpFile = await parseHttp(`
    GET /get

    ?? xpath /bookstore/book/title == Everyday Italian2
    `);

    const responses = await sendHttpFile(httpFile, {
      host: `http://localhost:${localServer.port}`,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].result).toBeFalsy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('/bookstore/book/title == Everyday Italian2');
  });
});
