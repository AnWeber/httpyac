import { initFileProvider, initHttpClientProvider, sendHttp } from '../testUtils';

describe('variables.basicAuth', () => {
  it('basic auth', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();
    await sendHttp(
      `
GET  /json
authorization: Basic john:doe

###
GET  /json
authorization: Basic john doe
    `
    );

    expect(requests[0].headers?.authorization).toBe('Basic am9objpkb2U=');
    expect(requests[1].headers?.authorization).toBe('Basic am9objpkb2U=');
  });
});
