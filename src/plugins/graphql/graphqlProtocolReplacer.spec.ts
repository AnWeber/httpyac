import * as models from '../../models';
import { graphqlProtocolReplacer } from './graphqlProtocolReplacer';

describe('graphqlProtocolReplacer', () => {
  it('should return POST', async () => {
    const request: models.Request = { method: 'graphql' };
    await graphqlProtocolReplacer(request);
    expect(request.method).toEqual('POST');
  });
  it('should  not change', async () => {
    const request: models.Request = { method: 'get' };
    await graphqlProtocolReplacer(request);
    expect(request.method).toEqual('get');
  });
});
