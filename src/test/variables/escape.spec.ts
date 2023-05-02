import { initFileProvider, sendHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('variables.escape', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  afterAll(async () => await localServer.stop());

  it('escape handlebar', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forPost('/post').thenJson(200, { foo: 'bar', test: 1 });
    const escape = `\\{\\{title\\}\\}`;

    await sendHttp(
      `
POST /post

<html>
<div>${escape}</div>
</html>
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(await requests[0].body.getText()).toBe('<html>\n<div>{{title}}</div>\n</html>');
  });
});
