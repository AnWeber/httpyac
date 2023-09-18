import { getLocal } from 'mockttp';

import { send } from '../../httpYacApi';
import { initFileProvider, parseHttp } from '../testUtils';

describe('metadata.ref', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  afterAll(async () => await localServer.stop());

  it('name + ref', async () => {
    initFileProvider();
    const refEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);
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
      variables: {
        host: `http://localhost:${localServer.port}`,
      },
    });

    const refRequests = await refEndpoints.getSeenRequests();
    expect(refRequests[0].path).toBe('/json');
    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].path).toBe('/post?test=1');
    expect(await requests[0].body.getText()).toBe('foo=bar');
  });

  it('not found ref', async () => {
    initFileProvider();
    const httpFile = await parseHttp(`

###
# @ref not_found
POST /post?test={{foo.test}}

foo={{foo.foo}}

    `);

    await expect(
      async () =>
        await send({
          httpFile,
          httpRegion: httpFile.httpRegions[1],
          variables: {
            host: `http://localhost:${localServer.port}`,
          },
        })
    ).rejects.toThrow(`ref not_found not found`);
  });

  it('name + ref + falsy body', async () => {
    initFileProvider();
    const refEndpoints = await localServer.forGet('/json').thenReply(200);
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);
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
      variables: {
        host: `http://localhost:${localServer.port}`,
      },
    });

    const refRequests = await refEndpoints.getSeenRequests();
    expect(refRequests[0].path).toBe('/json');
    expect(refRequests.length).toBe(1);
    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].path).toBe('/post?test=');
    expect(await requests[0].body.getText()).toBe('foo=');
    expect(await requests[1].body.getText()).toBe('foo=');
  });

  it('name + import + ref', async () => {
    initFileProvider({
      'import.http': `
# @name foo
GET  /json
      `,
    });
    await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);
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
      variables: {
        host: `http://localhost:${localServer.port}`,
      },
    });

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].path).toBe('/post?test=1');
    expect(await requests[0].body.getText()).toBe('foo=bar');
  });

  it('name + forceRef', async () => {
    initFileProvider();
    const refEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);
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
      variables: {
        host: `http://localhost:${localServer.port}`,
      },
    });

    const refRequests = await refEndpoints.getSeenRequests();
    expect(refRequests.length).toBe(2);
    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].path).toBe('/post?test=1');
    expect(await requests[0].body.getText()).toBe('foo=bar');
  });
});
