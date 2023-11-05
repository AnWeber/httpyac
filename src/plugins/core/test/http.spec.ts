import { initFileProvider, initHttpClientProvider, sendHttp } from '../../../test/testUtils';

describe('request.http', () => {
  it('get http', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

    await sendHttp(`GET /get`);

    expect(requests[0].url).toBe(`/get`);
  });

  it('get http with protocol', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

    await sendHttp(`GET /get HTTP/1.1`);

    expect(requests[0].url).toBe(`/get`);
  });

  it('get http with multiline', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

    await sendHttp(
      `
GET /bar
  ?test=foo
      `,
      { host: `` }
    );

    expect(requests[0].url).toBe('/bar?test=foo');
  });

  it('get http with headers', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

    await sendHttp(
      `
GET /get
authorization: Bearer test
date: 2015-06-01
      `,
      { host: `` }
    );

    expect(requests[0].headers?.authorization).toBe('Bearer test');
    expect(requests[0].headers?.date).toBe('2015-06-01');
  });

  it('post http', async () => {
    initFileProvider();
    const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
    const requests = initHttpClientProvider();

    await sendHttp(
      `
POST /post
content-type: application/json

${body}
      `,
      { host: `` }
    );

    expect(requests[0].headers?.['content-type']).toBe('application/json');
    expect(requests[0].body).toBe(body);
  });

  it('post json variable', async () => {
    initFileProvider();
    const body = JSON.stringify({ foo: 'foo', bar: 'bar' });
    const requests = initHttpClientProvider();

    await sendHttp(
      `
{{
  exports.body = ${body}
}}
POST /post
content-type: application/json

{{body}}
      `
    );

    expect(requests[0].headers?.['content-type']).toBe('application/json');
    expect(requests[0].body).toBe(body);
  });

  it('x-www-form-urlencoded', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

    await sendHttp(
      `
@clientId=test
@clientSecret=xxxx-xxxxxxx-xxxxxx-xxxx

          POST /post
content-type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={{clientId}}&client_secret={{clientSecret}}
      `,
      { host: `` }
    );

    expect(requests[0].headers?.['content-type']).toBe('application/x-www-form-urlencoded');
    expect(requests[0].body).toBe(
      `grant_type=client_credentials&client_id=test&client_secret=xxxx-xxxxxxx-xxxxxx-xxxx`
    );
  });
});
