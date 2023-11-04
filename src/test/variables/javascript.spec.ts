import { initFileProvider, initHttpClientProvider, parseHttp, sendHttpFile } from '../testUtils';

describe('variables.javascript', () => {
  it('use variables from scripts in request', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

    const httpFile = await parseHttp(`
    {{
      exports.foo = { version: 1};
    }}
    GET  /json?foo={{foo.version}}
    `);

    await sendHttpFile({ httpFile });

    expect(requests.length).toBe(1);
    expect(requests[0].url).toBe(`/json?foo=1`);
  });
  it('use null variable from scripts in request', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

    const httpFile = await parseHttp(`
    {{
      exports.foo = { version: null};
    }}
    GET  /json?foo={{foo.version}}
    `);

    await sendHttpFile({ httpFile });

    expect(requests.length).toBe(1);
    expect(requests[0].url).toBe(`/json?foo=null`);
  });
});
