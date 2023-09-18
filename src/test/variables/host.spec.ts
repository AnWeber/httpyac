import { getLocal } from 'mockttp';

import { initFileProvider, sendHttp } from '../testUtils';

describe('variables.host', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start());
  afterEach(() => localServer.stop());

  it('host', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(`
@host=http://localhost:${localServer.port}
GET /json
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/json`);
  });
});
