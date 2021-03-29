import { ProcessorContext } from '../../models';
import { URL } from 'url';
import aws4 = require('aws4');
import { getHeader } from '../../utils';

export async function awsAuthVariableReplacer(text: string, type: string, { request }: ProcessorContext) {
  if (type.toLowerCase() === "authorization" && text && request) {
    const match = /^\s*(aws)\s+(?<accessKeyId>[^\s]*)\s+(?<secretAccessKey>[^\s]*)\s*(token:\s*(?<token>[^\s]*))?\s*(region:\s*(?<region>[^\s]*))?\s*(service:\s*(?<service>[^\s]*))?\s*$/i.exec(text);

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

      if (!request.options) {
        request.options = {};
      }

      request.options = Object.assign(request.options, { http2: false });
      return result.headers.Authorization;
    }
  }
  return text;
}