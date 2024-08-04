import { send } from '../../../../httpYacApi';
import { initFileProvider, initHttpClientProvider, parseHttp } from '../../../../test/testUtils';

describe('metadata.ref', () => {
  it('name + ref', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: { foo: 'bar', test: 1 },
      })
    );

    const httpFile = await parseHttp(`
# @name foo
GET  /json

###
# @ref foo
POST /post?test={{foo.test}}

foo={{foo.foo}}

###
# @ref foo
POST /post?test={{foo.test}}

foo={{foo.foo}}
    `);

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
    });

    expect(requests[0].url).toBe('/json');
    expect(requests[1].url).toBe('/post?test=1');
    expect(requests[1].body).toBe('foo=bar');
  });

  it('not found ref', async () => {
    initFileProvider();
    const httpFile = await parseHttp(`

# @ref not_found
POST /post?test={{foo.test}}

foo={{foo.foo}}

    `);

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
    });
    expect(httpFile.httpRegions?.[0]?.testResults?.[0].message).toBe(`ref not_found not found`);
  });

  it('name + ref + falsy body', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        body: '',
      })
    );
    const httpFile = await parseHttp(`
# @name child
GET  /json

###
# @ref child
# @name parent
POST /post?test={{child}}

foo={{child}}

###
# @ref child
# @ref parent
POST /post?test={{parent}}

foo={{parent}}
    `);

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[2],
    });

    expect(requests.length).toBe(3);
    expect(requests[0].url).toBe('/json');
    expect(requests[1].url).toBe('/post?test=');
    expect(requests[1].body).toBe('foo=');
    expect(requests[2].body).toBe('foo=');
  });

  it('name + import + ref', async () => {
    initFileProvider({
      'import.http': `
# @name foo
GET  /json
      `,
    });
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: { foo: 'bar', test: 1 },
      })
    );
    const httpFile = await parseHttp(`
# @import ./import.http
###
# @ref foo
POST /post?test={{foo.test}}

foo={{foo.foo}}
    `);

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
    });

    expect(requests.length).toBe(2);
    expect(requests[1].url).toBe('/post?test=1');
    expect(requests[1].body).toBe('foo=bar');
  });

  it('name + forceRef', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: { foo: 'bar', test: 1 },
      })
    );
    const httpFile = await parseHttp(`
# @name foo
GET  /json

###
# @forceRef foo
POST /post?test={{foo.test}}

foo={{foo.foo}}

###
# @forceRef foo
POST /post?test={{foo.test}}

foo={{foo.foo}}
    `);
    const [, ...httpRegions] = httpFile.httpRegions;

    await send({
      httpFile,
      httpRegions,
    });

    expect(requests.length).toBe(4);
    expect(requests[3].url).toBe('/post?test=1');
    expect(requests[3].body).toBe('foo=bar');
  });
});
