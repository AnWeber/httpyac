import { initFileProvider, initHttpClientProvider, parseHttp, sendHttpFile, sendHttp } from '../../../test/testUtils';

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
  it('basic auth', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: { foo: 'bar', test: 1 },
      })
    );

    await sendHttp(`
    {{
      //pre request script
      const crypto = require('crypto');
      const date = new Date();
      const signatureBase64 = crypto.createHmac('sha256', 'secret')
      .update(\`\${request.method}_\${request.headers.key}\`).digest("base64");
      exports.authentication = \`Basic \${signatureBase64}\`;
    }}
    GET /json
    authorization: {{authentication}}
    key: test

    `);

    expect(requests[0].headers?.authorization).toBe('Basic 8hiIYW+ERaH03JKCDl62xluD3Rp7yzfpTPxKmwEYZ9U=');
  });
  it('allow comments in script', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: { foo: 'bar', test: 1 },
      })
    );
    await sendHttp(`
    {{
      //pre request script
      exports.authentication = \`Basic test\`;
      // after comment
    }}
    GET  /json
    authorization: {{authentication}}
    key: test

    `);

    expect(requests[0].headers?.authorization).toBe('Basic test');
  });
  it('allow invalid variable names', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: { foo: 'bar', test: 1 },
      })
    );

    const httpFile = await parseHttp(`
    ### test: (1)
    GET  /json

    ###
    GET  /json?foo={{(new Date()).toString()}}
    `);

    await sendHttpFile({ httpFile });

    expect(requests.length).toBe(2);
  });
});
