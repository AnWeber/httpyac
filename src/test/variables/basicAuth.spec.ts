import { initFileProvider, sendHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('variables.basicAuth', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  afterAll(async () => await localServer.stop());

  it('basic auth', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(
      `
GET  /json
Authorization: Basic john:doe

###
GET  /json
Authorization: Basic john doe
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers.authorization).toBe('Basic am9objpkb2U=');
    expect(requests[1].headers.authorization).toBe('Basic am9objpkb2U=');
  });
});
