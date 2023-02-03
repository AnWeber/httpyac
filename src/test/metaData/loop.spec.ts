import { send } from '../../httpYacApi';
import { initFileProvider, parseHttp, sendHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('metadata.name', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start(8003));
  afterEach(() => localServer.stop());

  it('loop for of', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenReply(200);

    await sendHttp(`
{{
exports.data = ['a', 'b', 'c'];
}}
###
# @loop for item of data
GET  http://localhost:8003/json?index={{$index}}&test={{item}}
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:8003/json?index=0&test=a');
    expect(requests[1].url).toBe('http://localhost:8003/json?index=1&test=b');
    expect(requests[2].url).toBe('http://localhost:8003/json?index=2&test=c');
  });

  it('loop for', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenReply(200);

    await sendHttp(`
# @loop for 3
GET  http://localhost:8003/json?test={{$index}}
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:8003/json?test=0');
    expect(requests[1].url).toBe('http://localhost:8003/json?test=1');
    expect(requests[2].url).toBe('http://localhost:8003/json?test=2');
  });

  it('loop while', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/json').thenReply(200);

    await sendHttp(`
{{
exports.expression = {
  index: 0,
};
}}
###
# @loop while expression.index < 3
GET  http://localhost:8003/json?test={{expression.index++}}
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:8003/json?test=0');
    expect(requests[1].url).toBe('http://localhost:8003/json?test=1');
    expect(requests[2].url).toBe('http://localhost:8003/json?test=2');
  });
  it('loop for + ref', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/test').thenCallback(req => ({
      status: 200,
      body: `foo${req.url.slice(-1)}`,
    }));

    const httpFile = await parseHttp(`
# @name foo
# @loop for 2
GET http://localhost:8003/test?index={{$index}}

###
# @ref foo
# @loop for item of fooList
GET http://localhost:8003/test?index={{$index}}&item={{item.body}}
    `);

    await send({
      httpFile,
      httpRegion: httpFile.httpRegions[1],
    });

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe('http://localhost:8003/test?index=0');
    expect(requests[1].url).toBe('http://localhost:8003/test?index=1');
    expect(requests[2].url).toBe('http://localhost:8003/test?index=0&item=foo0');
    expect(requests[3].url).toBe('http://localhost:8003/test?index=1&item=foo1');
  });
});
