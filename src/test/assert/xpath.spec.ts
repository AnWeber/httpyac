import { sendHttpFile, initFileProvider, parseHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('assert.xpath', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start(5007));
  afterEach(() => localServer.stop());
  it('should equal xpath', async () => {
    initFileProvider();
    await localServer
      .forGet('/get')
      .thenReply(200, `<bookstore><book><title>Everyday Italian</title></book></bookstore>`);
    const httpFile = await parseHttp(`
    GET http://localhost:5007/get

    ?? xpath /bookstore/book/title == Everyday Italian
    `);

    const responses = await sendHttpFile(httpFile);
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].result).toBeTruthy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('/bookstore/book/title == Everyday Italian');
  });
});
