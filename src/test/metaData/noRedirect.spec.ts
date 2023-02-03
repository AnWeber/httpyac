import { initFileProvider, sendHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('metadata.noRedirect', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start(8004));
  afterEach(() => localServer.stop());

  it('noRedirect', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/redirect').thenReply(302, undefined, {
      location: 'http://localhost:8004/json',
    });
    localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    const respones = await sendHttp(`
# @no-redirect
GET http://localhost:8004/redirect
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests.length).toBe(1);
    expect(requests[0].url).toBe('http://localhost:8004/redirect');
    expect(respones.length).toBe(1);
    expect(respones[0].statusCode).toBe(302);
  });
});
