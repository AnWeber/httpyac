import { getLocal } from 'mockttp';

import { initFileProvider, sendHttp } from '../testUtils';

describe('scripts.intellij', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  afterAll(async () => await localServer.stop());

  it('pre request script', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(`

  < {%
      request.variables.set("firstname", "John")
  %}
  GET http://localhost:${localServer.port}/json?q={{firstname}}

    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toContain('/json?q=John');
  });
});
