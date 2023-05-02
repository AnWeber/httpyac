import { send } from '../../httpYacApi';
import { initFileProvider, parseHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('metadata.ref', () => {
  const localServer = getLocal();
  beforeAll(() => localServer.start(8005));
  afterAll(() => localServer.stop());

  it('name + ref', async () => {
    initFileProvider();
    const refEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);
    const httpFile = await parseHttp(`
# @name foo
GET  http://localhost:8005/json

###
# @ref foo
POST http://localhost:8005/post?test={{foo.test}}

foo={{foo.foo}}

###
# @ref foo
POST http://localhost:8005/post?test={{foo.test}}

foo={{foo.foo}}
    `);

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
    });

    const refRequests = await refEndpoints.getSeenRequests();
    expect(refRequests[0].url).toBe('http://localhost:8005/json');
    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:8005/post?test=1');
    expect(await requests[0].body.getText()).toBe('foo=bar');
  });

  it('name + ref + falsy body', async () => {
    initFileProvider();
    const refEndpoints = await localServer.forGet('/json').thenReply(200);
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);
    const httpFile = await parseHttp(`
# @name child
GET  http://localhost:8005/json

###
# @ref child
# @name parent
POST http://localhost:8005/post?test={{child}}

foo={{child}}

###
# @ref child
# @ref parent
POST http://localhost:8005/post?test={{parent}}

foo={{parent}}
    `);

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[2],
    });

    const refRequests = await refEndpoints.getSeenRequests();
    expect(refRequests[0].url).toBe('http://localhost:8005/json');
    expect(refRequests.length).toBe(1);
    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:8005/post?test=');
    expect(await requests[0].body.getText()).toBe('foo=');
    expect(await requests[1].body.getText()).toBe('foo=');
  });

  it('name + import + ref', async () => {
    initFileProvider({
      'import.http': `
# @name foo
GET  http://localhost:8005/json
      `,
    });
    await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);
    const httpFile = await parseHttp(`
# @import ./import.http
###
# @ref foo
POST http://localhost:8005/post?test={{foo.test}}

foo={{foo.foo}}
    `);

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
    });

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:8005/post?test=1');
    expect(await requests[0].body.getText()).toBe('foo=bar');
  });

  it('name + forceRef', async () => {
    initFileProvider();
    const refEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);
    const httpFile = await parseHttp(`
# @name foo
GET  http://localhost:8005/json

###
# @forceRef foo
POST http://localhost:8005/post?test={{foo.test}}

foo={{foo.foo}}

###
# @forceRef foo
POST http://localhost:8005/post?test={{foo.test}}

foo={{foo.foo}}
    `);
    const [, ...httpRegions] = httpFile.httpRegions;

    await send({
      httpFile,
      httpRegions,
    });

    const refRequests = await refEndpoints.getSeenRequests();
    expect(refRequests.length).toBe(2);
    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:8005/post?test=1');
    expect(await requests[0].body.getText()).toBe('foo=bar');
  });
});
