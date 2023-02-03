import { send } from '../../httpYacApi';
import { initFileProvider, parseHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('metadata.jwt', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start(8002));
  afterEach(() => localServer.stop());
  it('jwt', async () => {
    initFileProvider();
    await localServer.forGet('/json').thenJson(200, {
      foo: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      test: 1,
    });
    const httpFile = await parseHttp(`
# @jwt foo
GET  http://localhost:8002/json
  `);
    httpFile.hooks.onResponse.addHook('test', response => {
      expect(response?.parsedBody).toBeDefined();
      expect((response?.parsedBody as Record<string, unknown>)?.foo_parsed).toBeDefined();
    });

    const result = await send({
      httpFile,
    });
    expect(result).toBeTruthy();
  });
});
