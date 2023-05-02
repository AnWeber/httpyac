import { initFileProvider, sendHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('metadata.noRedirect', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  afterAll(async () => await localServer.stop());
  it('follow redirect', async () => {
    initFileProvider();
    const redirectEndpoints = await localServer.forGet('/redirect').thenReply(302, undefined, {
      location: `http://localhost:${localServer.port}/json`,
    });
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    const respones = await sendHttp(
      `

GET /redirect
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await redirectEndpoints.getSeenRequests();
    expect(requests.length).toBe(1);
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/redirect`);
    const notCalledEndpoints = await mockedEndpoints.getSeenRequests();
    expect(notCalledEndpoints.length).toBe(1);
    expect(respones.length).toBe(1);
    expect(respones[0].statusCode).toBe(200);
  });
  it('noRedirect', async () => {
    initFileProvider();
    const redirectEndpoints = await localServer.forGet('/redirect').thenReply(302, undefined, {
      location: `http://localhost:${localServer.port}/json`,
    });
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    const respones = await sendHttp(
      `
# @no-redirect
GET /redirect
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await redirectEndpoints.getSeenRequests();
    expect(requests.length).toBe(1);
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/redirect`);
    const notCalledEndpoints = await mockedEndpoints.getSeenRequests();
    expect(notCalledEndpoints.length).toBe(0);
    expect(respones.length).toBe(1);
    expect(respones[0].statusCode).toBe(302);
  });
});
