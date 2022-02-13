import { ProcessorContext } from '../../../models';
import * as utils from '../../../utils';
import aws4 from 'aws4';
import { URL } from 'url';

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
      const requestOptions: aws4.Request = {
        method: request.method,
        headers: request.headers,
        host: url.host,
        path: url.pathname,
        region: match.groups.region,
        service: match.groups.service,
      };
      const result = await aws4.sign(requestOptions, credentials);

      Object.assign(request, { http2: false });
      return result.headers?.Authorization;
    }
  }
  return text;
}
