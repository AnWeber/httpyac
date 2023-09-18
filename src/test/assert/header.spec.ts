import { getLocal } from 'mockttp';

import { initFileProvider, parseHttp, sendHttpFile } from '../testUtils';

describe('assert.header', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  afterAll(async () => await localServer.stop());

  it('should equal header', async () => {
    initFileProvider();
    await localServer.forGet('/get').thenReply(200, undefined, {
      foo: 'bar',
    });
    const httpFile = await parseHttp(`
    GET /get

    ?? header foo == bar
    `);

    const responses = await sendHttpFile(httpFile, {
      host: `http://localhost:${localServer.port}`,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].result).toBeTruthy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('foo == bar');
  });
});
