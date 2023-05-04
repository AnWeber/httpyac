import { sendHttpFile, initFileProvider, parseHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('assert', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  afterAll(async () => await localServer.stop());
  it('should fail on empty type', async () => {
    initFileProvider();
    await localServer.forGet('/get').thenJson(200, {
      foo: 'bar',
    });
    const httpFile = await parseHttp(`
    GET /get

    ?? response.parsedBody == {"foo": "bar"}
    `);

    const responses = await sendHttpFile(httpFile, {
      host: `http://localhost:${localServer.port}`,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].result).toBeFalsy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('response.parsedBody == {"foo": "bar"}');
  });
  it('should fail on invalid type', async () => {
    initFileProvider();
    await localServer.forGet('/get').thenJson(200, {
      foo: 'bar',
    });
    const httpFile = await parseHttp(`
    GET /get

    ?? notvalid response.parsedBody == {"foo": "bar"}
    `);

    const responses = await sendHttpFile(httpFile, {
      host: `http://localhost:${localServer.port}`,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].result).toBeFalsy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('response.parsedBody == {"foo": "bar"}');
  });
  it('should ignore test on invalid predicate', async () => {
    initFileProvider();
    await localServer.forGet('/get').thenJson(200, {
      foo: 'bar',
    });
    const httpFile = await parseHttp(`
    GET /get

    ?? js response.parsedBody =!= {"foo": "bar"}
    `);

    const responses = await sendHttpFile(httpFile, {
      host: `http://localhost:${localServer.port}`,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBeUndefined();
  });
});
