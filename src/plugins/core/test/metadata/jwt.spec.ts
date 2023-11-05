import { send } from '../../../../httpYacApi';
import { HttpResponse } from '../../../../models';
import { stringifySafe } from '../../../../utils';
import { initFileProvider, initHttpClientProvider, parseHttp } from '../../../../test/testUtils';

describe('metadata.jwt', () => {
  it('jwt', async () => {
    initFileProvider();
    initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: {
          foo: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          test: 1,
        },
      })
    );
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
