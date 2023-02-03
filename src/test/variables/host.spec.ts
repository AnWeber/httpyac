import { initFileProvider, sendHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('variables.host', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start(6004));
  afterEach(() => localServer.stop());

  it('host', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(`
@host=http://localhost:6004
GET /json
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:6004/json');
  });
});
