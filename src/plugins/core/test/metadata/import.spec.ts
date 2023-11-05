import { send } from '../../../../httpYacApi';
import { initFileProvider, initHttpClientProvider, parseHttp } from '../../../../test/testUtils';

describe('metadata.import', () => {
  it('name + import + ref', async () => {
    initFileProvider({
      'import.http': `
# @name foo
GET /nameimportjson
      `,
    });
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: {
          foo: 'bar',
          test: 1,
        },
      })
    );
    const httpFile = await parseHttp(
      `
# @import ./import.http
###
# @ref foo
POST /nameimport?test={{foo.test}}

foo={{foo.foo}}
    `
    );

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
    });

    expect(requests.length).toBe(2);
    expect(requests[1].url).toBe(`/nameimport?test=1`);
    expect(requests[1].body).toBe('foo=bar');
  });
  it('import global variable', async () => {
    initFileProvider({
      'import.http': `
@foo=bar
@bar=foo
      `,
    });
    const requests = initHttpClientProvider();
    const httpFile = await parseHttp(`
# @import ./import.http
POST /globalvarimport?foo={{foo}}

bar={{bar}}
    `);

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
    });

    expect(requests.length).toBe(1);
    expect(requests[0].url).toBe(`/globalvarimport?foo=bar`);
    expect(requests[0].body).toBe('bar=foo');
  });
  it('import named variable', async () => {
    initFileProvider({
      'import.http': `
      ###
# @name test
@foo=bar
@bar=foo
      `,
    });
    const requests = initHttpClientProvider();
    const httpFile = await parseHttp(`
# @import ./import.http
# @ref test
POST /namedvar?foo={{foo}}

bar={{bar}}
    `);

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
    });

    expect(requests.length).toBe(1);
    expect(requests[0].url).toBe(`/namedvar?foo=bar`);
    expect(requests[0].body).toBe('bar=foo');
  });
  it('import request with using global host variable', async () => {
    initFileProvider({
      'import.http': `
      @host=http://localhost

      ### Apple
      # @name send_apple
      POST /globalhostimport
      content-type: application/json

      {
              "id": "0001",
              "type": "fruit",
              "name": "Apple"
      }
      `,
    });
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: {
          foo: 'bar',
          test: 1,
        },
      })
    );
    const httpFile = await parseHttp(`
# @import ./import.http

###
# @forceRef send_apple
    `);

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
    });

    expect(requests.length).toBe(2);
    expect(requests[1].url).toBe(`http://localhost/globalhostimport`);
    expect(requests[1].headers?.['content-type']).toBe('application/json');
  });
  it('should import httpFile in all files', async () => {
    initFileProvider({
      'foo.http': `
# @name foo
GET /foo
      `,
      'bar.http': `
      # @name bar
      # @import ./foo.http
      # @ref foo
      GET /bar?test={{foo.test}}
            `,
    });
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: {
          foo: 'bar',
          bar: 'foo',
          test: 1,
        },
      })
    );
    const httpFile = await parseHttp(
      `
# @import ./foo.http
# @import ./bar.http
# @ref foo
# @ref bar
POST /test?test={{foo.foo}}{{bar.bar}}

foo={{foo.foo}}
bar={{bar.bar}}`
    );

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
    });

    expect(requests.length).toBe(3);
    expect(requests[2].url).toBe(`/test?test=barfoo`);
    expect(requests[2].body).toBe('foo=bar\nbar=foo');
  });
});
