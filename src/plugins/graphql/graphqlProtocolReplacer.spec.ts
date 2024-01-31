import * as models from '../../models';
import { graphqlProtocolReplacer } from './graphqlProtocolReplacer';

describe('graphqlProtocolReplacer', () => {
  it('should return POST', async () => {
    const request: models.Request = { url: '', method: 'graphql' };
    await graphqlProtocolReplacer(request);
    expect(request.method).toEqual('POST');
    expect(request.headers?.['content-type']).toEqual('application/json');
  });
  it('should  not change', async () => {
    const request: models.Request = { url: '', method: 'get' };
    await graphqlProtocolReplacer(request);
    expect(request.method).toEqual('get');
  });
});
