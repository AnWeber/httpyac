import { ProcessorContext } from '../../models';
import { OptionsOfUnknownResponseBody } from 'got';
import merge from 'lodash/merge';
import aws4 = require('aws4');

export async function awsAuthVariableReplacer(text: string, type: string, { request }: ProcessorContext) {
  if (type.toLowerCase() === "authorization" && text && request) {
    const match = /^\s*(aws)\s+(?<accessKeyId>[^\s]*)\s+(?<secretAccessKey>[^\s]*)\s*(token:\s*(?<token>[^\s]*))?\s*(region:\s*(?<region>[^\s]*))?\s*(service:\s*(?<service>[^\s]*))?\s*$/i.exec(text);

    if (match && match.groups && match.groups.accessKeyId && match.groups.secretAccessKey) {
      const credentials = {
        accessKeyId: match.groups.accessKeyId,
        secretAccessKey: match.groups.secretAccessKey,
        sessionToken: match.groups.token
      };
      const awsScope = {
        region: match.groups.region,
        service: match.groups.service,
      };
      const options: OptionsOfUnknownResponseBody = {
        http2: false,
        hooks: {
          beforeRequest: [async options => {
            await aws4.sign({ ...options, ...awsScope }, credentials);
          }]
        }
      };
      if (request.options) {
        merge(request.options, options);
      } else {
        request.options = options;
      }
      return undefined;
    }
  }
  return text;
}