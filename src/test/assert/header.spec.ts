import { sendHttpFile, initFileProvider, parseHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('assert.header', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start(5002));
  afterEach(() => localServer.stop());

  it('should equal header', async () => {
    initFileProvider();
    await localServer.forGet('/get').thenReply(200, undefined, {
      foo: 'bar',
    });
    const httpFile = await parseHttp(`
    GET http://localhost:5002/get

    ?? header foo == bar
    `);

    const responses = await sendHttpFile(httpFile);
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].result).toBeTruthy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('foo == bar');
  });
});
