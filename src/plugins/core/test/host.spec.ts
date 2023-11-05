import { initFileProvider, initHttpClientProvider, sendHttp } from '../../../test/testUtils';

describe('variables.host', () => {
  it('host', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();
    await sendHttp(`
@host=http://localhost
GET /json
    `);

    expect(requests[0].url).toBe(`http://localhost/json`);
  });
});
