import { initFileProvider, initHttpClientProvider, parseHttp, sendHttpFile } from '../../../test/testUtils';

describe('request.odata', () => {
  it('batch processing', async () => {
    initFileProvider();

    const requests = initHttpClientProvider();

    const body = `--batch_36522ad7-fc75-4b56-8c71-56071383e77b
    Content-Type: application/http
    Content-Transfer-Encoding:binary

    GET /service/Customers('ALFKI') HTTP/1.1

    --batch_36522ad7-fc75-4b56-8c71-56071383e77b
    Content-Type: multipart/mixed; boundary=changeset_77162fcd-b8da-41ac-a9f8-9357efbbd621
    Content-Length: ###

    --changeset_77162fcd-b8da-41ac-a9f8-9357efbbd621
    Content-Type: application/http
    Content-Transfer-Encoding: binary

    POST /service/Customers HTTP/1.1
    Host: host
    Content-Type: application/atom+xml;type=entry
    Content-Length: ###

    <AtomPub representation of a new Customer>

    --changeset_77162fcd-b8da-41ac-a9f8-9357efbbd621
    Content-Type: application/http
    Content-Transfer-Encoding:binary

    PUT /service/Customers('ALFKI') HTTP/1.1
    Host: host
    Content-Type: application/json
    If-Match: xxxxx
    Content-Length: ###

    <JSON representation of Customer ALFKI>

    --changeset_77162fcd-b8da-41ac-a9f8-9357efbbd621--

    --batch_36522ad7-fc75-4b56-8c71-56071383e77b--`;

    const httpFile = await parseHttp(
      `
POST /$batch
Content-Type: multipart/mixed; boundary=batch_36522ad7-fc75-4b56-8c71-56071383e77b

${body}
    `
    );

    expect(httpFile.httpRegions.length).toBe(1);
    await sendHttpFile({
      httpFile,
    });

    expect(requests[0].body).toBe(body);
  });
});
