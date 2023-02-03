import { initFileProvider, sendHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('metadata.disabled', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start(8001));
  afterEach(() => localServer.stop());

  it('disabled', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(`
# @disabled
GET http://localhost:8001/json
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests.length).toBe(0);
  });

  it('disabled with script', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(`
# @disabled !this.token
{{
exports.token = 'test'
}}
GET http://localhost:8001/json
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests.length).toBe(0);
  });
  it('disabled with expression', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(`
{{
httpRegion.metaData.disabled = true;
}}
GET http://localhost:8001/json
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests.length).toBe(0);
  });
});
