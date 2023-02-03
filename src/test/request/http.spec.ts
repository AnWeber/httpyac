import { sendHttp, initFileProvider } from '../testUtils';
import { getLocal } from 'mockttp';

describe('request.http', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start(7003));
  afterEach(() => localServer.stop());

  it('get http', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/get').thenReply(200);

    await sendHttp(`GET http://localhost:7003/get`);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['user-agent']).toBe('httpyac');
    expect(requests[0].url).toBe('http://localhost:7003/get');
  });

  it('get http with protocol', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/get').thenReply(200);

    await sendHttp(`GET http://localhost:7003/get HTTP/1.1`);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['user-agent']).toBe('httpyac');
    expect(requests[0].url).toBe('http://localhost:7003/get');
  });

  it('get http with multiline', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/bar').thenReply(200);

    await sendHttp(`
GET http://localhost:7003
  /bar
  ?test=foo
      `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].path).toBe('/bar?test=foo');
  });

  it('get http with headers', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/get').thenReply(200);

    await sendHttp(`
GET http://localhost:7003/get
Authorization: Bearer test
Date: 2015-06-01
      `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers.authorization).toBe('Bearer test');
    expect(requests[0].headers.date).toBe('2015-06-01');
  });

  it('post http', async () => {
    initFileProvider();
    const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

    await sendHttp(`
POST http://localhost:7003/post
Content-Type: application/json

${body}
      `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['content-type']).toBe('application/json');
    expect(await requests[0].body.getText()).toBe(body);
  });

  it('post json variable', async () => {
    initFileProvider();
    const body = JSON.stringify({ foo: 'foo', bar: 'bar' });
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

    await sendHttp(`
{{
  exports.body = ${body}
}}
POST http://localhost:7003/post
Content-Type: application/json

{{body}}
      `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['content-type']).toBe('application/json');
    expect(await requests[0].body.getText()).toBe(body);
  });

  it('x-www-form-urlencoded', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

    await sendHttp(`
@clientId=test
@clientSecret=xxxx-xxxxxxx-xxxxxx-xxxx

          POST http://localhost:7003/post
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={{clientId}}&client_secret={{clientSecret}}
      `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(await requests[0].body.getText()).toBe(
      `grant_type=client_credentials&client_id=test&client_secret=xxxx-xxxxxxx-xxxxxx-xxxx`
    );
  });
});
