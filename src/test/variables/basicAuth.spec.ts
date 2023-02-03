import { initFileProvider, sendHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('variables.basicAuth', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start(6001));
  afterEach(() => localServer.stop());

  it('basic auth', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(`
GET  http://localhost:6001/json
Authorization: Basic john:doe

###
GET  http://localhost:6001/json
Authorization: Basic john doe
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers.authorization).toBe('Basic am9objpkb2U=');
    expect(requests[1].headers.authorization).toBe('Basic am9objpkb2U=');
  });
});
