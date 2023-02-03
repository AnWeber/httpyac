import { sendHttp, initFileProvider } from '../testUtils';
import { getLocal } from 'mockttp';

describe('request.body', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start(7001));
  afterEach(() => localServer.stop());

  it('imported body', async () => {
    const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
    initFileProvider({ 'body.json': body });
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

    await sendHttp(`
POST http://localhost:7001/post
Content-Type: application/json

<@ ./body.json
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['content-type']).toBe('application/json');
    expect(await requests[0].body.getText()).toBe(body);
  });

  it('imported buffer body', async () => {
    const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
    initFileProvider({ 'body.json': body });
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

    await sendHttp(`
POST http://localhost:7001/post
Content-Type: application/json

< ./body.json
    `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['content-type']).toBe('application/json');
    expect(await requests[0].body.getText()).toBe(body);
  });
  it('imported buffer body with replace', async () => {
    const body = JSON.stringify({ foo: 'foo', bar: '{{bar}}' }, null, 2);
    initFileProvider({ 'body.json': body });
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

    await sendHttp(`
@bar=bar2
POST http://localhost:7001/post
Content-Type: application/json

<@ ./body.json
      `);

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['content-type']).toBe('application/json');
    expect(await requests[0].body.getText()).toBe(JSON.stringify({ foo: 'foo', bar: 'bar2' }, null, 2));
  });
});
