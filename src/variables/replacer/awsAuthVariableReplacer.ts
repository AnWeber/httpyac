import { ProcessorContext } from '../../models';
import { URL } from 'url';
import aws4 = require('aws4');
import { ParserRegex } from '../../parser';
import { isString } from '../../utils';

export async function awsAuthVariableReplacer(text: unknown, type: string, { request }: ProcessorContext) : Promise<unknown> {
  if (type.toLowerCase() === 'authorization' && isString(text) && request?.url) {
    const match = ParserRegex.auth.aws.exec(text);

    if (match && match.groups && match.groups.accessKeyId && match.groups.secretAccessKey) {
      const credentials = {
        accessKeyId: match.groups.accessKeyId,
        secretAccessKey: match.groups.secretAccessKey,
        sessionToken: match.groups.token
      };
      const url = new URL(request.url);
      const requestOptions = {
        ...request,
        host: url.host,
        path: url.pathname,
        region: match.groups.region,
        service: match.groups.service,
      };
      const result = await aws4.sign(requestOptions, credentials);

      Object.assign(request, { http2: false });
      return result.headers.Authorization;
    }
  }
  return text;
}
