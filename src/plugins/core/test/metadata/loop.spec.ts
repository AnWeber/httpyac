import { send } from '../../../../httpYacApi';
import { initFileProvider, initHttpClientProvider, parseHttp, sendHttp } from '../../../../test/testUtils';

describe('metadata.name', () => {
  it('loop for of', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

    await sendHttp(
      `
{{
exports.data = ['a', 'b', 'c'];
}}
###
# @loop for item of data
GET /json?index={{$index}}&test={{item}}
    `
    );

    expect(requests[0].url).toBe(`/json?index=0&test=a`);
    expect(requests[1].url).toBe(`/json?index=1&test=b`);
    expect(requests[2].url).toBe(`/json?index=2&test=c`);
  });

  it('loop for', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

    await sendHttp(
      `
# @loop for 3
GET  /json?test={{$index}}
    `
    );

    expect(requests[0].url).toBe(`/json?test=0`);
    expect(requests[1].url).toBe(`/json?test=1`);
    expect(requests[2].url).toBe(`/json?test=2`);
  });

  it('loop while', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

    await sendHttp(
      `
{{
exports.expression = {
  index: 0,
};
}}
###
# @loop while expression.index < 3
GET  /json?test={{expression.index++}}
    `
    );

    expect(requests[0].url).toBe(`/json?test=0`);
    expect(requests[1].url).toBe(`/json?test=1`);
    expect(requests[2].url).toBe(`/json?test=2`);
  });
  it('loop for + ref', async () => {
    initFileProvider();
    const requests = initHttpClientProvider(req =>
      Promise.resolve({
        body: `foo${req.url.slice(-1)}`,
      })
    );

    const httpFile = await parseHttp(
      `
# @name foo
# @loop for 2
GET /test?index={{$index}}

###
# @ref foo
# @loop for item of fooList
GET /test?index={{$index}}&item={{item.body}}
    `
    );

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
    });

    expect(requests[0].url).toBe(`/test?index=0`);
    expect(requests[1].url).toBe(`/test?index=1`);
    expect(requests[2].url).toBe(`/test?index=0&item=foo0`);
    expect(requests[3].url).toBe(`/test?index=1&item=foo1`);
  });
});
