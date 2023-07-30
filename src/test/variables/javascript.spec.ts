import { initFileProvider, parseHttp, sendHttpFile } from '../testUtils';
import { getLocal } from 'mockttp';

describe('variables.javascript', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  afterAll(async () => await localServer.stop());

  it('use variables from scripts in request', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    const httpFile = await parseHttp(`
    {{
      exports.foo = { version: 1};
    }}
    GET  http://localhost:${localServer.port}/json?foo={{foo.version}}
    `);

    await sendHttpFile(httpFile);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests.length).toBe(1);
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/json?foo=1`);
  });
  it('use null variable from scripts in request', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    const httpFile = await parseHttp(`
    {{
      exports.foo = { version: null};
    }}
    GET  http://localhost:${localServer.port}/json?foo={{foo.version}}
    `);

    await sendHttpFile(httpFile);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests.length).toBe(1);
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/json?foo=null`);
  });
});
