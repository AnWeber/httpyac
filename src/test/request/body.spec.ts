import { getLocal } from 'mockttp';

import { initFileProvider, sendHttp } from '../testUtils';

describe('request.body', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  beforeEach(() => localServer.reset());
  afterAll(async () => await localServer.stop());
  it('should send body', async () => {
    initFileProvider();
    const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

    await sendHttp(
      `
POST /post
Content-Type: application/json

${body}
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['content-type']).toBe('application/json');
    expect(await requests[0].body.getText()).toBe(body);
  });
  it('should send body with no empty line', async () => {
    initFileProvider();
    const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

    await sendHttp(
      `
POST /post
Content-Type: application/json
${body}
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['content-type']).toBe('application/json');
    expect(await requests[0].body.getText()).toBe(body);
  });
  it('should send imported body', async () => {
    const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
    initFileProvider({ 'body.json': body });
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

    await sendHttp(
      `
POST /post
Content-Type: application/json

<@ ./body.json
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['content-type']).toBe('application/json');
    expect(await requests[0].body.getText()).toBe(body);
  });

  it('should send imported buffer body', async () => {
    const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
    initFileProvider({ 'body.json': body });
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

    await sendHttp(
      `
POST /post
Content-Type: application/json

< ./body.json
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['content-type']).toBe('application/json');
    expect(await requests[0].body.getText()).toBe(body);
  });
  it('should send imported buffer body with replace', async () => {
    const body = JSON.stringify({ foo: 'foo', bar: '{{bar}}' }, null, 2);
    initFileProvider({ 'body.json': body });
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

    await sendHttp(
      `
@bar=bar2
POST /post
Content-Type: application/json

<@ ./body.json
      `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['content-type']).toBe('application/json');
    expect(await requests[0].body.getText()).toBe(JSON.stringify({ foo: 'foo', bar: 'bar2' }, null, 2));
  });
  it('should send mulitpart form body', async () => {
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

    await sendHttp(
      `
@bar=bar2
POST /post
Content-Type: multipart/form-data; boundary=WebKitFormBoundary

--WebKitFormBoundary
Content-Disposition: form-data; name="text"

invoice_text: {{bar}}
--WebKitFormBoundary--
      `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['content-type']).toBe('multipart/form-data; boundary=WebKitFormBoundary');
    expect(await requests[0].body.getText()).toBe(
      `--WebKitFormBoundary\r\nContent-Disposition: form-data; name="text"\r\n\r\ninvoice_text: bar2\r\n--WebKitFormBoundary--`
    );
  });
});
