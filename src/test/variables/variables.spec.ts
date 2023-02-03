import { initFileProvider, sendHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('variables.set', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start(6005));
  afterEach(() => localServer.stop());
  it('file variables', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

    await sendHttp(`
@foo=foo
@bar={{foo}}bar
GET http://localhost:6005/json?bar={{bar}}
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:6005/json?bar=foobar');
  });

  it('set string variable', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });

    await sendHttp(`
# @name fooString
GET  http://localhost:6005/test

@slideshow={{fooString.slideshow.author}}
###
#@ref fooString
GET  http://localhost:6005/test?author={{slideshow}}
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:6005/test');
    expect(requests[1].url).toBe('http://localhost:6005/test?author=httpyac');
  });

  it('set object variable', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });

    await sendHttp(`
# @name fooObject
GET  http://localhost:6005/test

@slideshow={{fooObject.slideshow}}
###
GET  http://localhost:6005/test?author={{slideshow.author}}
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:6005/test');
    expect(requests[1].url).toBe('http://localhost:6005/test?author=httpyac');
  });

  it('set object variable with number', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/get').thenJson(200, { foo: { test: 1 } });

    await sendHttp(`
# @name objectNumber
GET http://localhost:6005/get

@foo={{objectNumber.foo}}
###
GET http://localhost:6005/get?test={{foo.test}}
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:6005/get');
    expect(requests[1].url).toBe('http://localhost:6005/get?test=1');
  });

  it('direct replace variable', async () => {
    initFileProvider();
    await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });
    const mockedEndpoints = await localServer.forGet('/text').thenJson(200, { slideshow: { author: 'foo' } });

    await sendHttp(`
GET  http://localhost:6005/test

@slideshow={{response.parsedBody.slideshow}}
###
GET  http://localhost:6005/text?author={{slideshow.author}}
###
GET  http://localhost:6005/text?another_author={{slideshow.author}}
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:6005/text?author=httpyac');
    expect(requests[1].url).toBe('http://localhost:6005/text?another_author=httpyac');
  });

  it('lazy replace variable', async () => {
    initFileProvider();
    await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });
    const mockedEndpoints = await localServer.forGet('/text').thenJson(200, { slideshow: { author: 'foo' } });

    await sendHttp(`
GET http://localhost:6005/test

@slideshow:={{response.parsedBody.slideshow}}
###
GET http://localhost:6005/text?author={{slideshow.author}}
###
GET http://localhost:6005/text?another_author={{slideshow.author}}
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:6005/text?author=httpyac');
    expect(requests[1].url).toBe('http://localhost:6005/text?another_author=foo');
  });

  it('string empty variable', async () => {
    initFileProvider();
    await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });
    const mockedEndpoints = await localServer.forGet('/text').thenJson(200, { slideshow: { author: 'foo' } });

    await sendHttp(`
{{
exports.foo = "";
}}
GET http://localhost:6005/text?foo={{foo}}

    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:6005/text?foo=');
  });
  it('nested replace variable', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });

    await sendHttp(`
@baz=works
{{
exports.testObj = { bar: '{{baz}}'};
}}
GET http://localhost:6005/test?test={{JSON.stringify(testObj)}}
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:6005/test?test={%22bar%22:%22works%22}');
  });
});
