import { getLocal } from 'mockttp';

import { send } from '../../httpYacApi';
import { HttpResponse } from '../../models';
import { stringifySafe } from '../../utils';
import { initFileProvider, parseHttp } from '../testUtils';

describe('metadata.jwt', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  afterAll(async () => await localServer.stop());
  it('jwt', async () => {
    initFileProvider();
    await localServer.forGet('/json').thenJson(200, {
      foo: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      test: 1,
    });
    const httpFile = await parseHttp(`
# @jwt foo
GET  /json
  `);

    let httpReponse: HttpResponse | undefined;
    httpFile.hooks.onResponse.addHook('test', response => {
      httpReponse = response;
    });

    const result = await send({
      httpFile,
      variables: {
        host: `http://localhost:${localServer.port}`,
      },
    });
    expect(result).toBeTruthy();
    expect(httpReponse?.parsedBody).toBeDefined();
    expect(httpReponse?.body).toBe(stringifySafe(httpReponse?.parsedBody, 2));
    expect((httpReponse?.parsedBody as Record<string, unknown>)?.foo_parsed).toEqual({
      iat: 1516239022,
      name: 'John Doe',
      sub: '1234567890',
    });
  });
});
