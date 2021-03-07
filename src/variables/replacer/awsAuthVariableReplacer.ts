import { ProcessorContext } from '../../models';
import { OptionsOfUnknownResponseBody } from 'got';
import merge from 'lodash/merge';
import {sign} from 'aws4';

export async function awsAuthVariableReplacer(text: string, type: string, { request }: ProcessorContext) {
  if (type.toLowerCase() === "authorization" && text && request) {
    const match = /^\s*(aws)\s+(?<accessKeyId>[^\s]*)\s+(?<secretAccessKey>[^\s]*)\s*(token:\s*(?<token>[^\s]*))?\s*(region:\s*(?<region>[^\s]*))?\s*(service:\s*(?<service>[^\s]*))?\s*$/i.exec(text);

    if (match && match.groups && match.groups.accessKeyId && match.groups.secretAccessKey) {
      const credentials = {
        accessKeyId: match.groups.accessKeyId,
        secretAccessKey: match.groups.secretAccessKey,
        token: match.groups.token
      };
      const awsScope = {
        region: match.groups.region,
        service: match.groups.service,
      };
      const options: OptionsOfUnknownResponseBody = {
        hooks: {
          beforeRequest: [options => {
            return sign({...options, ...awsScope}, credentials);
          }]
        }
      };
      if (request.options) {
        merge(request.options, options);
      } else {
        request.options = options;
      }
    }
  }
  return text;
}