import { TestResultStatus } from '../../../models';
import { initFileProvider, initHttpClientProvider, parseHttp, sendHttpFile } from '../../../test/testUtils';

describe('assert.body', () => {
  it('should equal body', async () => {
    initFileProvider();
    initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: {
          foo: 'bar',
        },
      })
    );
    const httpFile = await parseHttp(`
    GET /get

    ?? body == {"foo":"bar"}
    ?? body sha256 eji/gfOD9pQzrW6QDTWz4jhVk/dqe3q11DVbi6Qe4ks=
    ?? body sha512 DbaK1OQdOya6P8SKXafJ9ha4E+d8tOlRGH4fKjfCutlAQQififYBLue0TiH4Y8XZVT47Zl7a6GQLsidLVVJm6w==
    ?? body md5 m7WPJhkuS6APAeLnsTa72A==
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(4);
    expect(httpFile.httpRegions[0].testResults?.every(obj => obj.status === TestResultStatus.SUCCESS)).toBeTruthy();
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('body == {"foo":"bar"}');
    expect(httpFile.httpRegions[0].testResults?.[1].message).toBe(
      'body sha256 eji/gfOD9pQzrW6QDTWz4jhVk/dqe3q11DVbi6Qe4ks='
    );
    expect(httpFile.httpRegions[0].testResults?.[2].message).toBe(
      'body sha512 DbaK1OQdOya6P8SKXafJ9ha4E+d8tOlRGH4fKjfCutlAQQififYBLue0TiH4Y8XZVT47Zl7a6GQLsidLVVJm6w=='
    );
    expect(httpFile.httpRegions[0].testResults?.[3].message).toBe('body md5 m7WPJhkuS6APAeLnsTa72A==');
  });
  it('should equal body property', async () => {
    initFileProvider();

    initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: {
          foo: 'bar',
        },
      })
    );
    const httpFile = await parseHttp(`
    GET /get

    ?? body foo == bar
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.SUCCESS);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('foo == bar');
  });
  it('should equal body array', async () => {
    initFileProvider();

    initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: {
          foo: ['bar'],
        },
      })
    );
    const httpFile = await parseHttp(`
    GET /get

    ?? body foo == {{["bar"]}}
    `);

    const responses = await sendHttpFile({
      httpFile,
    });
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(200);
    expect(httpFile.httpRegions[0].testResults?.length).toBe(1);
    expect(httpFile.httpRegions[0].testResults?.[0].status).toBe(TestResultStatus.SUCCESS);
    expect(httpFile.httpRegions[0].testResults?.[0].message).toBe('foo == bar');
  });
});
