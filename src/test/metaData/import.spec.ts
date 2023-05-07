import { send } from '../../httpYacApi';
import { initFileProvider, parseHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('metadata.import', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  beforeEach(() => localServer.reset());
  afterAll(async () => await localServer.stop());

  it.skip('name + import + ref', async () => {
    initFileProvider({
      'import.http': `
# @name foo
GET http://localhost:${localServer.port}/nameimportjson
      `,
    });
    await localServer.forGet('/nameimportjson').thenJson(200, { foo: 'bar', test: 1 });
    const mockedEndpoints = await localServer.forPost('/nameimport').thenJson(200, { foo: 'bar', test: 1 });
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
      variables: {
        host: `http://localhost:${localServer.port}`,
      },
    });

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].path).toBe(`/nameimport?test=1`);
    expect(await requests[0].body.getText()).toBe('foo=bar');
  });
  it('import global variable', async () => {
    initFileProvider({
      'import.http': `
@foo=bar
@bar=foo
      `,
    });
    const mockedEndpoints = await localServer.forPost('/globalvarimport').thenReply(200);
    const httpFile = await parseHttp(`
# @import ./import.http
POST /globalvarimport?foo={{foo}}

bar={{bar}}
    `);

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
      variables: {
        host: `http://localhost:${localServer.port}`,
      },
    });

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].path).toBe(`/globalvarimport?foo=bar`);
    expect(await requests[0].body.getText()).toBe('bar=foo');
  });
  it('import named variable', async () => {
    initFileProvider({
      'import.http': `
      ###
# @test
@foo=bar
@bar=foo
      `,
    });
    const mockedEndpoints = await localServer.forPost('/namedvar').thenReply(200);
    const httpFile = await parseHttp(`
# @import ./import.http
# @ref test
POST /namedvar?foo={{foo}}

bar={{bar}}
    `);

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
      variables: {
        host: `http://localhost:${localServer.port}`,
      },
    });

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].path).toBe(`/namedvar?foo=bar`);
    expect(await requests[0].body.getText()).toBe('bar=foo');
  });
  it('import request with using global host variable', async () => {
    initFileProvider({
      'import.http': `
      @host=http://localhost:${localServer.port}

      ### Apple
      # @name send_apple
      POST /globalhostimport
      Content-Type: application/json

      {
              "id": "0001",
              "type": "fruit",
              "name": "Apple"
      }
      `,
    });
    await localServer.forGet('/globalhost').thenJson(200, { foo: 'bar', test: 1 });
    const mockedEndpoints = await localServer.forPost('/globalhostimport').thenReply(200);
    const httpFile = await parseHttp(`
# @import ./import.http

###
# @forceRef send_apple
    `);

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
    });

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].path).toBe(`/globalhostimport`);
    expect(requests[0].headers['content-type']).toBe('application/json');
  });
});
