import { initFileProvider, initHttpClientProvider, sendHttp } from '../../../../test/testUtils';

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

    const variables: Record<string, string> = {};
    await sendHttp(
      `
{{
  exports.foo="bar"
}}
# @disabled foo==="bar"
GET /json
    `,
      variables
    );

    expect(variables.foo).toBe('bar');
    expect(requests.length).toBe(0);
  });
});
