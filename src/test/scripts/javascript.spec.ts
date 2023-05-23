import { initFileProvider, parseHttp, sendHttp, sendHttpFile } from '../testUtils';
import { getLocal } from 'mockttp';

describe('scripts.javascript', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  afterAll(async () => await localServer.stop());

  it('basic auth', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(`
    {{
      //pre request script
      const crypto = require('crypto');
      const date = new Date();
      const signatureBase64 = crypto.createHmac('sha256', 'secret')
      .update(\`\${request.method}_\${request.headers.key}\`).digest("base64");
      exports.authentcation = \`Basic \${signatureBase64}\`;
    }}
    GET  http://localhost:${localServer.port}/json
    authorization: {{authentcation}}
    key: test

    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers.authorization).toBe('Basic 8hiIYW+ERaH03JKCDl62xluD3Rp7yzfpTPxKmwEYZ9U=');
  });
  it('allow comments in script', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(`
    {{
      //pre request script
      exports.authentcation = \`Basic test\`;
      // after comment
    }}
    GET  http://localhost:${localServer.port}/json
    authorization: {{authentcation}}
    key: test

    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers.authorization).toBe('Basic test');
  });
  it('allow invalid variable names', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    const httpFile = await parseHttp(`
    ### test: (1)
    GET  http://localhost:${localServer.port}/json

    ###
    GET  http://localhost:${localServer.port}/json?foo={{(new Date()).toString()}}
    `);

    await sendHttpFile(httpFile);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests.length).toBe(2);
  });
});
