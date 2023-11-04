import { initFileProvider, initHttpClientProvider, sendHttp } from '../testUtils';

describe('metadata.disabled', () => {
  it('disabled', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: { foo: 'bar', test: 1 },
      })
    );
    await sendHttp(
      `
# @disabled
GET /json
    `
    );

    expect(requests.length).toBe(0);
  });

  it('disabled with script', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: { foo: 'bar', test: 1 },
      })
    );

    await sendHttp(
      `
# @disabled !this.token
{{
exports.token = 'test'
}}
GET /json
    `
    );

    expect(requests.length).toBe(0);
  });
  it('disabled with expression', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: { foo: 'bar', test: 1 },
      })
    );

    await sendHttp(
      `
{{
httpRegion.metaData.disabled = true;
}}
GET h/json
    `
    );

    expect(requests.length).toBe(0);
  });
});
