import { initFileProvider, initHttpClientProvider, sendHttp } from '../../../test/testUtils';

describe('variables.escape', () => {
  it('escape handlebar', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();
    const escape = `\\{\\{title\\}\\}`;

    await sendHttp(
      `
POST /post

<html>
<div>${escape}</div>
</html>
    `
    );

    expect(requests[0].body).toBe('<html>\n<div>{{title}}</div>\n</html>');
  });
});
