import { initFileProvider, initHttpClientProvider, sendHttp } from '../../../test/testUtils';

describe('request.body', () => {
  it('should send body', async () => {
    initFileProvider();
    const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);

    const requests = initHttpClientProvider();

    await sendHttp(
      `
POST /post
content-type: application/json

${body}
    `
    );

    expect(requests[0].headers?.['content-type']).toBe('application/json');
    expect(requests[0].body).toBe(body);
  });
  it('should send body with no empty line', async () => {
    initFileProvider();
    const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
    const requests = initHttpClientProvider();

    await sendHttp(
      `
POST /post
content-type: application/json
${body}
    `
    );

    expect(requests[0].headers?.['content-type']).toBe('application/json');
    expect(requests[0].body).toBe(body);
  });
  it('should send imported body', async () => {
    const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
    initFileProvider({ 'body.json': body });
    const requests = initHttpClientProvider();

    await sendHttp(
      `
POST /post
content-type: application/json

<@ ./body.json
    `
    );

    expect(requests[0].headers?.['content-type']).toBe('application/json');
    expect(requests[0].body).toBe(body);
  });

  it('should send imported buffer body', async () => {
    const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
    initFileProvider({ 'body.json': body });
    const requests = initHttpClientProvider();

    await sendHttp(
      `
POST /post
content-type: application/json

< ./body.json
    `
    );

    expect(requests[0].headers?.['content-type']).toBe('application/json');
    expect(Buffer.isBuffer(requests[0].body)).toBe(true);
    expect(requests[0].body?.toString('utf-8')).toBe(body);
  });
  it('should send imported buffer body with replace', async () => {
    const body = JSON.stringify({ foo: 'foo', bar: '{{bar}}' }, null, 2);
    initFileProvider({ 'body.json': body });
    const requests = initHttpClientProvider();

    await sendHttp(
      `
@bar=bar2
POST /post
content-type: application/json

<@ ./body.json
      `
    );

    expect(requests[0].headers?.['content-type']).toBe('application/json');
    expect(requests[0].body).toBe(JSON.stringify({ foo: 'foo', bar: 'bar2' }, null, 2));
  });
  it('should send mulitpart form body', async () => {
    const requests = initHttpClientProvider();

    await sendHttp(
      `
@bar=bar2
POST /post
content-type: multipart/form-data; boundary=WebKitFormBoundary

--WebKitFormBoundary
Content-Disposition: form-data; name="text"

invoice_text: {{bar}}
--WebKitFormBoundary--
      `
    );

    expect(requests[0].headers?.['content-type']).toBe('multipart/form-data; boundary=WebKitFormBoundary');
    expect(requests[0].body).toBe(
      `--WebKitFormBoundary\r\nContent-Disposition: form-data; name="text"\r\n\r\ninvoice_text: bar2\r\n--WebKitFormBoundary--`
    );
  });
  it('should send mulitpart form body with variables and file', async () => {
    const requests = initHttpClientProvider();

    initFileProvider({ 'body.json': 'test' });
    await sendHttp(
      `
@bar=bar2
POST /post
content-type: multipart/form-data; boundary=WebKitFormBoundary

--WebKitFormBoundary
Content-Disposition: form-data; name="text"

invoice_text: {{bar}}
--WebKitFormBoundary
Content-Disposition: form-data; name="invoice"; filename="invoice.pdf"
Content-Type: application/pdf

< ./body.json
--WebKitFormBoundary--
      `
    );

    expect(requests[0].headers?.['content-type']).toBe('multipart/form-data; boundary=WebKitFormBoundary');
    expect(Buffer.isBuffer(requests[0].body)).toBe(true);
    expect(requests[0].body?.toString()).toBe(
      `--WebKitFormBoundary\r\nContent-Disposition: form-data; name="text"\r\n\r\ninvoice_text: bar2\r\n--WebKitFormBoundary\r\nContent-Disposition: form-data; name="invoice"; filename="invoice.pdf"\r\nContent-Type: application/pdf\r\n\r\ntest\r\n--WebKitFormBoundary--`
    );
  });
});
