import { initFileProvider, initHttpClientProvider, sendHttp } from '../../../../test/testUtils';
describe('metadata.noRedirect', () => {
  it('follow redirect', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

    await sendHttp(
      `

GET /redirect
    `
    );

    expect(requests.length).toBe(1);
    expect(requests[0].url).toBe(`/redirect`);
    expect(requests[0].noRedirect).toBeUndefined();
  });
  it('noRedirect', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

    await sendHttp(
      `
# @no-redirect
GET /redirect
    `
    );

    expect(requests.length).toBe(1);
    expect(requests[0].url).toBe(`/redirect`);
    expect(requests[0].noRedirect).toBe(true);
  });
});
