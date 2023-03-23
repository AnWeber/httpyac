import { initFileProvider, sendHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('scripts.javascript', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start());
  afterEach(() => localServer.stop());

  it('basic auth', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(`
    {{
      //pre request script
      const crypto = require('crypto');
      const date = new Date();
      const signatureBase64 = crypto.createHmac('sha256', 'secret')
      .update(\`\${request.method}\u2028\${request.url}\`).digest("base64");
      exports.authentcation = \`Basic \${signatureBase64}\`;
    }}
    GET  http://localhost:${localServer.port}/json
    authorization: {{authentcation}}

    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers.authorization).toBe('Basic H9PPJrcxbDVji+d8UTU7Yr5bYn+MEZwW3Y2NPmgQI0Q=');
  });
});
