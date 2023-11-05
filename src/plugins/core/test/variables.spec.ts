import { initFileProvider, initHttpClientProvider, sendHttp } from '../../../test/testUtils';

describe('variables.set', () => {
  it('file variables', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: { foo: 'bar', test: 1 },
      })
    );

    await sendHttp(
      `
@foo=foo
@bar={{foo}}bar
GET /json?bar={{bar}}
    `
    );

    expect(requests[0].url).toBe(`/json?bar=foobar`);
  });

  it('set string variable', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: { slideshow: { author: 'httpyac' } },
      })
    );
    await sendHttp(
      `
# @name fooString
GET  /test

@slideshow={{fooString.slideshow.author}}
###
#@ref fooString
GET  /test?author={{slideshow}}
    `
    );

    expect(requests[0].url).toBe(`/test`);
    expect(requests[1].url).toBe(`/test?author=httpyac`);
  });

  it('set object variable', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: { slideshow: { author: 'httpyac' } },
      })
    );
    await sendHttp(
      `
# @name fooObject
GET  /test

@slideshow={{fooObject.slideshow}}
###
GET  /test?author={{slideshow.author}}
    `
    );

    expect(requests[0].url).toBe(`/test`);
    expect(requests[1].url).toBe(`/test?author=httpyac`);
  });

  it('set object variable with number', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: { foo: { test: 1 } },
      })
    );
    await sendHttp(
      `
# @name objectNumber
GET /get

@foo={{objectNumber.foo}}
###
GET /get?test={{foo.test}}
    `
    );

    expect(requests[0].url).toBe(`/get`);
    expect(requests[1].url).toBe(`/get?test=1`);
  });

  it('direct replace variable', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(req =>
      req.url.includes('text')
        ? Promise.resolve({
            parsedBody: { slideshow: { author: 'foo' } },
          })
        : Promise.resolve({
            parsedBody: { slideshow: { author: 'httpyac' } },
          })
    );

    await sendHttp(
      `
GET  /test

@slideshow={{response.parsedBody.slideshow}}
###
GET  /text?author={{slideshow.author}}
###
GET  /text?another_author={{slideshow.author}}
    `
    );

    expect(requests[1].url).toBe(`/text?author=httpyac`);
    expect(requests[2].url).toBe(`/text?another_author=httpyac`);
  });

  it('lazy replace variable', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(req =>
      req.url.includes('text')
        ? Promise.resolve({
            parsedBody: { slideshow: { author: 'foo' } },
          })
        : Promise.resolve({
            parsedBody: { slideshow: { author: 'httpyac' } },
          })
    );

    await sendHttp(
      `
GET /test

@slideshow:={{response.parsedBody.slideshow}}
###
GET /text?author={{slideshow.author}}
###
GET /text?another_author={{slideshow.author}}
    `
    );

    expect(requests[1].url).toBe(`/text?author=httpyac`);
    expect(requests[2].url).toBe(`/text?another_author=foo`);
  });

  it('string empty variable', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(req =>
      req.url.includes('text')
        ? Promise.resolve({
            parsedBody: { slideshow: { author: 'foo' } },
          })
        : Promise.resolve({
            parsedBody: { slideshow: { author: 'httpyac' } },
          })
    );
    await sendHttp(
      `
{{
exports.foo = "";
}}
GET /text?foo={{foo}}

    `
    );

    expect(requests[0].url).toBe(`/text?foo=`);
  });
  it('nested replace variable', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(req =>
      req.url.includes('text')
        ? Promise.resolve({
            parsedBody: { slideshow: { author: 'foo' } },
          })
        : Promise.resolve({
            parsedBody: { slideshow: { author: 'httpyac' } },
          })
    );
    await sendHttp(
      `
@baz=works
{{
  exports.testObj = { bar: '{{baz}}'};
}}
GET /nested?test={{JSON.stringify(testObj)}}
    `
    );

    expect(requests[0].url).toBe(`/nested?test={"bar":"works"}`);
  });

  it('support await syntax in custom scripts', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(() =>
      Promise.resolve({
        parsedBody: {
          slideshow: { author: 'httpyac' },
        },
      })
    );
    await sendHttp(
      `
{{
const asyncFn = async () => ({ bar: 'works'});
exports.testObj = await asyncFn();
}}
GET /awaittest?test={{JSON.stringify(testObj)}}
    `
    );

    expect(requests[0].url).toBe(`/awaittest?test={"bar":"works"}`);
  });
});
