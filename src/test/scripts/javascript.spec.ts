import { initFileProvider, sendHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('scripts.javascript', () => {
  const localServer = getLocal();
  beforeAll(() => localServer.start());
  afterAll(() => localServer.stop());

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
});
