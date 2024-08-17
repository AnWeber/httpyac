import aws4 from 'aws4';
import { URL } from 'url';

import { ProcessorContext } from '../../models';
import * as utils from '../../utils';

export async function awsAuthVariableReplacer(
  text: unknown,
  type: string,
  context: ProcessorContext
): Promise<unknown> {
  const { request } = context;
  if (type.toLowerCase() === 'authorization' && utils.isString(text) && utils.isHttpRequest(request) && request?.url) {
    const match =
      /^\s*(aws)\s+(?<accessKeyId>[^\s]*)\s+(?<secretAccessKey>[^\s]*)\s*(token:\s*(?<token>[^\s]*))?\s*(region:\s*(?<region>[^\s]*))?\s*(service:\s*(?<service>[^\s]*))?\s*$/iu.exec(
        text
      );

    if (match && match.groups && match.groups.accessKeyId && match.groups.secretAccessKey) {
      utils.report(context, `get AWS Authorization`);
      const credentials = {
        accessKeyId: match.groups.accessKeyId,
        secretAccessKey: match.groups.secretAccessKey,
        sessionToken: match.groups.token,
      };
      const url = new URL(request.url);
      if (!request.headers) {
        request.headers = {};
      }
      const requestOptions: aws4.Request = {
        method: request.method,
        headers: request.headers,
        host: url.host,
        path: `${url.pathname}${url.search}`,
        region: match.groups.region,
        service: match.groups.service,
        body: Buffer.isBuffer(request.body) || utils.isString(request.body) ? request.body : undefined,
      };
      const result = await aws4.sign(requestOptions, credentials);

      Object.assign(request, { http2: false });
      Object.assign(request.headers, result.headers);
      return result.headers?.Authorization;
    }
  }
  return text;
}
