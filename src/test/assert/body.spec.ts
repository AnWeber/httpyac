import { sendHttpFile, initFileProvider, parseHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('assert.body', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start(5001));
  afterEach(() => localServer.stop());
  it('should equal body', async () => {
    initFileProvider();
    await localServer.forGet('/get').thenJson(200, {
      foo: 'bar',
    });
    const httpFile = await parseHttp(`
    GET http://localhost:5001/get

    ?? body == {"foo": "bar"}
    `);

    const responses = await sendHttpFile(httpFile);
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].result).toBeTruthy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('body == {"foo": "bar"}');
  });
  it('should equal body property', async () => {
    initFileProvider();
    await localServer.forGet('/get').thenJson(200, {
      foo: 'bar',
    });
    const httpFile = await parseHttp(`
    GET http://localhost:5001/get

    ?? body foo == bar
    `);

    const responses = await sendHttpFile(httpFile);
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].result).toBeTruthy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('foo == bar');
  });
  it('should equal body array', async () => {
    initFileProvider();
    await localServer.forGet('/get').thenJson(200, {
      foo: ['bar'],
    });
    const httpFile = await parseHttp(`
    GET http://localhost:5001/get

    ?? body foo == {{["bar"]}}
    `);

    const responses = await sendHttpFile(httpFile);
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].result).toBeTruthy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('foo == ["bar"]');
  });
});
