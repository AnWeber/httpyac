import { initFileProvider, initHttpClientProvider, sendHttp } from '../../../test/testUtils';

describe('scripts.intellij', () => {
  it('pre request script', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: { foo: 'bar', test: 1 },
      })
    );

    await sendHttp(`

  < {%
      request.variables.set("firstname", "John")
  %}
  GET /json?q={{firstname}}

    `);

    expect(requests[0].url).toContain('/json?q=John');
  });
});
