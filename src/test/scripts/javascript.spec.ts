import { initFileProvider, initHttpClientProvider, parseHttp, sendHttp, sendHttpFile } from '../testUtils';

describe('scripts.javascript', () => {
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
      exports.authentcation = \`Basic \${signatureBase64}\`;
    }}
    GET /json
    authorization: {{authentcation}}
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
      exports.authentcation = \`Basic test\`;
      // after comment
    }}
    GET  /json
    authorization: {{authentcation}}
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
