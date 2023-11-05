import { getLocal } from 'mockttp';

import { initFileProvider, sendHttp } from '../../../test/testUtils';

describe('variables.digestAuth', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  afterAll(async () => await localServer.stop());

  it('digest auth', async () => {
    initFileProvider();
    const missingAuthEndpoints = await localServer
      .forGet('/json')
      .matching(request => !request.headers.authorization)
      .thenReply(401, undefined, {
        'www-authenticate':
          'Digest realm="json@localhost",qop="auth,auth-int",nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093",opaque="5ccc069c403ebaf9f0171e9517f40e41"',
      });
    const mockedEndpoints = await localServer
      .forGet('/json')
      .matching(request => !!request.headers.authorization)
      .thenReply(200);

    await sendHttp(
      `
GET  /json
Authorization: Digest john doe

###
GET  /json
Authorization: Digest john:doe
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const authMissingRequests = await missingAuthEndpoints.getSeenRequests();
    expect(authMissingRequests.length).toBe(2);
    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests.length).toBe(2);
    for (const request of requests) {
      expect(request.headers.authorization).toBe(
        'Digest username="john", realm="json@localhost", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", uri="/json", response="4d157d692f3e05a1cbe192ddbc427782", opaque="5ccc069c403ebaf9f0171e9517f40e41"'
      );
    }
  });
});
