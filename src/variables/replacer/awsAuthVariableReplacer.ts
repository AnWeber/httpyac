import { ProcessorContext, VariableReplacer, VariableReplacerType } from '../../models';
import { URL } from 'url';
import aws4 = require('aws4');
import { ParserRegex } from '../../parser';

export class AwsAuthVariableReplacer implements VariableReplacer {
  type = VariableReplacerType.aws;

  async replace(text: string, type: string, { request }: ProcessorContext) : Promise<string | undefined> {
    if (type.toLowerCase() === 'authorization' && text && request?.url) {
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
}
