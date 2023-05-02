import { initFileProvider, sendHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('variables.set', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  afterAll(async () => await localServer.stop());
  it('file variables', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(
      `
@foo=foo
@bar={{foo}}bar
GET /json?bar={{bar}}
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/json?bar=foobar`);
  });

  it('set string variable', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });

    await sendHttp(
      `
# @name fooString
GET  /test

@slideshow={{fooString.slideshow.author}}
###
#@ref fooString
GET  /test?author={{slideshow}}
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/test`);
    expect(requests[1].url).toBe(`http://localhost:${localServer.port}/test?author=httpyac`);
  });

  it('set object variable', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });

    await sendHttp(
      `
# @name fooObject
GET  /test

@slideshow={{fooObject.slideshow}}
###
GET  /test?author={{slideshow.author}}
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/test`);
    expect(requests[1].url).toBe(`http://localhost:${localServer.port}/test?author=httpyac`);
  });

  it('set object variable with number', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/get').thenJson(200, { foo: { test: 1 } });

    await sendHttp(
      `
# @name objectNumber
GET /get

@foo={{objectNumber.foo}}
###
GET /get?test={{foo.test}}
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/get`);
    expect(requests[1].url).toBe(`http://localhost:${localServer.port}/get?test=1`);
  });

  it('direct replace variable', async () => {
    initFileProvider();
    await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });
    const mockedEndpoints = await localServer.forGet('/text').thenJson(200, { slideshow: { author: 'foo' } });

    await sendHttp(
      `
GET  /test

@slideshow={{response.parsedBody.slideshow}}
###
GET  /text?author={{slideshow.author}}
###
GET  /text?another_author={{slideshow.author}}
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/text?author=httpyac`);
    expect(requests[1].url).toBe(`http://localhost:${localServer.port}/text?another_author=httpyac`);
  });

  it('lazy replace variable', async () => {
    initFileProvider();
    await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });
    const mockedEndpoints = await localServer.forGet('/text').thenJson(200, { slideshow: { author: 'foo' } });

    await sendHttp(
      `
GET /test

@slideshow:={{response.parsedBody.slideshow}}
###
GET /text?author={{slideshow.author}}
###
GET /text?another_author={{slideshow.author}}
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/text?author=httpyac`);
    expect(requests[1].url).toBe(`http://localhost:${localServer.port}/text?another_author=foo`);
  });

  it('string empty variable', async () => {
    initFileProvider();
    await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });
    const mockedEndpoints = await localServer.forGet('/text').thenJson(200, { slideshow: { author: 'foo' } });

    await sendHttp(
      `
{{
exports.foo = "";
}}
GET /text?foo={{foo}}

    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/text?foo=`);
  });
  it('nested replace variable', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/nested').thenJson(200, { slideshow: { author: 'httpyac' } });

    await sendHttp(
      `
@baz=works
{{
  exports.testObj = { bar: '{{baz}}'};
}}
GET /nested?test={{JSON.stringify(testObj)}}
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].path).toBe(`/nested?test={%22bar%22:%22works%22}`);
  });

  it('support await syntax in custom scripts', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/awaittest').thenJson(200, { slideshow: { author: 'httpyac' } });
    await sendHttp(
      `
{{
const asyncFn = async () => ({ bar: 'works'});
exports.testObj = await asyncFn();
}}
GET /awaittest?test={{JSON.stringify(testObj)}}
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].path).toBe(`/awaittest?test={%22bar%22:%22works%22}`);
  });
});
