import * as models from '../../models';
import { awsAuthVariableReplacer } from './awsAuthVariableReplacer';

describe('awsAuthVariableReplacer', () => {
  it('should return modified request', async () => {
    const request = {
      url: 'https://localhost:5000',
      method: 'GET',
      headers: {},
      protocol: 'HTTP',
    };
    const result = await awsAuthVariableReplacer(
      'AWS doe 12345678 token:token region:eu-central-1 service:cognito-idp',
      'authorization',
      {
        request,
      } as models.ProcessorContext
    );
    expect(result).toMatch(
      /AWS4-HMAC-SHA256 Credential=doe\/\d+\/eu-central-1\/cognito-idp\/aws4_request,\sSignedHeaders=host;x-amz-date;x-amz-security-token/u
    );
    expect(Object.keys(request.headers)).toEqual(['Host', 'X-Amz-Security-Token', 'X-Amz-Date', 'Authorization']);
  });
  it('should return same value if not authorization', async () => {
    const result = await awsAuthVariableReplacer('foo', 'unittest', {
      request: {
        url: 'https://localhost:5000',
        method: 'GET',
      },
    } as models.ProcessorContext);
    expect(result).toEqual('foo');
  });
});
