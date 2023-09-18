import { getLocal } from 'mockttp';

import { initFileProvider, sendHttp } from '../testUtils';

describe('metadata.disabled', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  afterAll(async () => await localServer.stop());

  it('disabled', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(
      `
# @disabled
GET /json
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests.length).toBe(0);
  });

  it('disabled with script', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(
      `
# @disabled !this.token
{{
exports.token = 'test'
}}
GET /json
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests.length).toBe(0);
  });
  it('disabled with expression', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(
      `
{{
httpRegion.metaData.disabled = true;
}}
GET h/json
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests.length).toBe(0);
  });
});
